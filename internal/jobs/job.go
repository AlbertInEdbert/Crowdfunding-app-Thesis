package jobs

import "context"

type Job interface {
	RegisterJobs(ctx context.Context)
}
