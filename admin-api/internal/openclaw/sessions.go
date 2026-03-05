package openclaw

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/creack/pty"
)

const (
	sessionStateCreated            = "CREATED"
	sessionStateLaunching          = "LAUNCHING_ONBOARD"
	sessionStateAwaitingRedirect   = "AWAITING_REDIRECT_URL"
	sessionStateExchangingToken    = "EXCHANGING_TOKEN"
	sessionStateMergingCredentials = "MERGING_CREDENTIALS"
	sessionStateRestarting         = "RESTARTING_SERVICE"
	sessionStateSucceeded          = "SUCCEEDED"
	sessionStateFailed             = "FAILED"
	sessionStateCancelled          = "CANCELLED"
	sessionStateExpired            = "EXPIRED"
)

var openAIAuthURLPattern = regexp.MustCompile(`https://auth\.openai\.com/oauth/authorize\S+`)

type codexSession struct {
	id               string
	state            string
	authURL          string
	errorCode        string
	errorMessage     string
	createdAt        time.Time
	expiresAt        time.Time
	defaultModelHint string

	tmpPaths Paths
	cmd      *exec.Cmd
	ptmx     *os.File
	cancel   context.CancelFunc
	done     chan error

	outputTail []string
}

type SessionManager struct {
	cli   *CLI
	store *Store

	mu       sync.RWMutex
	sessions map[string]*codexSession
}

func NewSessionManager(cli *CLI, store *Store) *SessionManager {
	return &SessionManager{
		cli:      cli,
		store:    store,
		sessions: map[string]*codexSession{},
	}
}

func (m *SessionManager) Create(ctx context.Context, defaultModel string) (CodexAuthSessionResource, error) {
	id, err := randomID(12)
	if err != nil {
		return CodexAuthSessionResource{}, err
	}

	tmpHome := filepath.Join(os.TempDir(), "openclaw-codex-session-"+id)
	if err := os.MkdirAll(tmpHome, 0o700); err != nil {
		return CodexAuthSessionResource{}, fmt.Errorf("create session temp dir: %w", err)
	}
	paths := m.cli.paths.WithHome(tmpHome)

	sCtx, cancel := context.WithCancel(context.Background())
	args := []string{
		"onboard",
		"--accept-risk",
		"--mode", "local",
		"--flow", "manual",
		"--auth-choice", "openai-codex",
		"--workspace", filepath.Join(tmpHome, "workspace"),
		"--skip-channels",
		"--skip-skills",
		"--skip-ui",
		"--skip-daemon",
		"--skip-health",
		"--gateway-port", "18789",
		"--gateway-bind", "loopback",
		"--gateway-auth", "token",
		"--gateway-token", "oc-admin-session-" + id,
	}
	cmd := exec.CommandContext(sCtx, "openclaw", args...)
	cmd.Env = append(os.Environ(),
		"OPENCLAW_HOME="+paths.Home,
		"OPENCLAW_CONFIG_PATH="+paths.ConfigPath,
	)

	ptmx, err := pty.Start(cmd)
	if err != nil {
		cancel()
		return CodexAuthSessionResource{}, fmt.Errorf("start onboard pty: %w", err)
	}

	s := &codexSession{
		id:               id,
		state:            sessionStateLaunching,
		createdAt:        time.Now(),
		expiresAt:        time.Now().Add(10 * time.Minute),
		defaultModelHint: defaultModel,
		tmpPaths:         paths,
		cmd:              cmd,
		ptmx:             ptmx,
		cancel:           cancel,
		done:             make(chan error, 1),
		outputTail:       make([]string, 0, 64),
	}

	m.mu.Lock()
	m.sessions[id] = s
	m.mu.Unlock()

	go m.captureOutput(s)
	go m.watchDone(s)

	// Let output parser discover URL if possible.
	time.Sleep(300 * time.Millisecond)
	return m.toResource(s), nil
}

func (m *SessionManager) Get(id string) (CodexAuthSessionResource, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	s, ok := m.sessions[id]
	if !ok {
		return CodexAuthSessionResource{}, ErrNotFound
	}
	m.expireIfNeeded(s)
	return m.toResource(s), nil
}

func (m *SessionManager) SubmitRedirect(ctx context.Context, id, redirectURL string) (CodexAuthSessionResource, error) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	if !ok {
		m.mu.Unlock()
		return CodexAuthSessionResource{}, ErrNotFound
	}
	m.expireIfNeeded(s)
	if s.state != sessionStateAwaitingRedirect {
		res := m.toResource(s)
		m.mu.Unlock()
		return CodexAuthSessionResource{}, fmt.Errorf("session not ready for redirect: %s", res.State)
	}
	s.state = sessionStateExchangingToken
	m.mu.Unlock()

	if _, err := s.ptmx.Write([]byte(strings.TrimSpace(redirectURL) + "\n")); err != nil {
		m.failSession(s, "SESSION_WRITE_FAILED", fmt.Sprintf("write redirect url: %v", err))
		return m.toResource(s), err
	}

	select {
	case <-ctx.Done():
		return CodexAuthSessionResource{}, ctx.Err()
	case <-time.After(90 * time.Second):
		// Some OpenClaw onboard flows persist OAuth credentials but do not exit promptly.
		// Attempt a best-effort merge before marking timeout.
		if err := m.mergeFromTemp(s); err != nil {
			m.failSession(s, "SESSION_TIMEOUT", "timed out waiting for onboard completion")
		} else {
			s.cancel()
			_ = s.ptmx.Close()
		}
	case err := <-s.done:
		if err != nil {
			// If process exits non-zero after credentials were already written, keep flow recoverable.
			if mergeErr := m.mergeFromTemp(s); mergeErr != nil {
				m.failSession(s, "ONBOARD_FAILED", err.Error())
			}
		}
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	m.expireIfNeeded(s)
	return m.toResource(s), nil
}

func (m *SessionManager) Cancel(id string) (CodexAuthSessionResource, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	s, ok := m.sessions[id]
	if !ok {
		return CodexAuthSessionResource{}, ErrNotFound
	}
	if s.state == sessionStateSucceeded || s.state == sessionStateFailed || s.state == sessionStateCancelled || s.state == sessionStateExpired {
		return m.toResource(s), nil
	}
	s.state = sessionStateCancelled
	s.errorCode = "SESSION_CANCELLED"
	s.errorMessage = "session cancelled by user"
	s.cancel()
	_ = s.ptmx.Close()
	return m.toResource(s), nil
}

func (m *SessionManager) captureOutput(s *codexSession) {
	scanner := bufio.NewScanner(s.ptmx)
	for scanner.Scan() {
		line := scanner.Text()
		m.mu.Lock()
		if len(s.outputTail) >= 64 {
			s.outputTail = s.outputTail[1:]
		}
		s.outputTail = append(s.outputTail, line)

		if s.authURL == "" {
			if match := openAIAuthURLPattern.FindString(line); match != "" {
				s.authURL = match
				if s.state == sessionStateLaunching {
					s.state = sessionStateAwaitingRedirect
				}
			}
		}
		m.mu.Unlock()
	}
}

func (m *SessionManager) watchDone(s *codexSession) {
	err := s.cmd.Wait()
	s.done <- err
	_ = s.ptmx.Close()

	m.mu.Lock()
	state := s.state
	m.mu.Unlock()

	if state == sessionStateCancelled || state == sessionStateExpired || state == sessionStateSucceeded || state == sessionStateFailed {
		return
	}
	if err != nil {
		m.failSession(s, "ONBOARD_PROCESS_EXITED", err.Error())
		return
	}
	if state == sessionStateLaunching || state == sessionStateAwaitingRedirect {
		m.failSession(s, "ONBOARD_INCOMPLETE", "onboard exited before oauth completion")
		return
	}
	_ = m.mergeFromTemp(s)
}

func (m *SessionManager) failSession(s *codexSession, code, message string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s.state = sessionStateFailed
	s.errorCode = code
	s.errorMessage = message
}

func (m *SessionManager) mergeFromTemp(s *codexSession) error {
	m.mu.Lock()
	switch s.state {
	case sessionStateSucceeded:
		m.mu.Unlock()
		return nil
	case sessionStateCancelled, sessionStateExpired:
		m.mu.Unlock()
		return fmt.Errorf("session cannot merge credentials in state %s", s.state)
	}
	s.state = sessionStateMergingCredentials
	m.mu.Unlock()

	if err := m.store.MergeCodexFromTemp(context.Background(), s.tmpPaths, s.defaultModelHint, m.cli); err != nil {
		m.mu.Lock()
		s.state = sessionStateFailed
		s.errorCode = "MERGE_CREDENTIALS_FAILED"
		s.errorMessage = err.Error()
		m.mu.Unlock()
		return err
	}

	m.mu.Lock()
	s.state = sessionStateSucceeded
	s.errorCode = ""
	s.errorMessage = ""
	m.mu.Unlock()
	return nil
}

func (m *SessionManager) toResource(s *codexSession) CodexAuthSessionResource {
	return CodexAuthSessionResource{
		Name:             "codexAuthSessions/" + s.id,
		SessionID:        s.id,
		State:            s.state,
		AuthURL:          s.authURL,
		ExpiresAt:        s.expiresAt.UnixMilli(),
		CreatedAt:        s.createdAt.UnixMilli(),
		DefaultModelHint: s.defaultModelHint,
		ErrorCode:        s.errorCode,
		ErrorMessage:     s.errorMessage,
	}
}

func (m *SessionManager) expireIfNeeded(s *codexSession) {
	if time.Now().After(s.expiresAt) {
		if s.state != sessionStateSucceeded && s.state != sessionStateFailed && s.state != sessionStateCancelled {
			s.state = sessionStateExpired
			s.errorCode = "SESSION_EXPIRED"
			s.errorMessage = "session expired"
			s.cancel()
			_ = s.ptmx.Close()
		}
	}
}

func randomID(n int) (string, error) {
	if n <= 0 {
		return "", errors.New("n must be positive")
	}
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
