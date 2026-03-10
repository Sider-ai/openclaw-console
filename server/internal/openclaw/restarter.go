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
	if err := exec.CommandContext(ctx, "openclaw", "gateway", "restart").Run(); err != nil {
		return fmt.Errorf("restart openclaw gateway: %w", err)
	}
	return nil
}
