package openclaw

import (
	"context"
	"fmt"
	"os/exec"
)

type Restarter interface {
	Restart(ctx context.Context) error
}

type SystemRestarter struct{}

func NewSystemRestarter() SystemRestarter {
	return SystemRestarter{}
}

func (SystemRestarter) Restart(ctx context.Context) error {
	if _, err := exec.LookPath("systemctl"); err != nil {
		return restartOpenClawGateway(ctx)
	}
	cmd := exec.CommandContext(ctx, "systemctl", "restart", "openclaw")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("restart openclaw service: %w", err)
	}
	return nil
}

func restartOpenClawGateway(ctx context.Context) error {
	if _, err := exec.LookPath("openclaw"); err != nil {
		return err
	}
	cmd := exec.CommandContext(ctx, "openclaw", "gateway", "restart")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("restart openclaw gateway: %w", err)
	}
	return nil
}
