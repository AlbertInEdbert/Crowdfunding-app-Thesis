package jobs

import (
	"context"
	"log"
	"time"

	"github.com/SamuelLazuardy/investment/internal/usecase"
)

type CampaignJob struct {
	campaignUsecase usecase.CampaignUsecase
}

func NewCampaignJob(campaignUsecase usecase.CampaignUsecase) *CampaignJob {
	return &CampaignJob{campaignUsecase: campaignUsecase}
}

func (j *CampaignJob) Run() {
	if err := j.notifyH3(); err != nil {
		log.Printf("H-3 notify error: %v", err)
	}
	if err := j.StartPendingCampaign(); err != nil {
		log.Printf("start campaigns error: %v", err)
	}
	if err := j.closeFinishedCampaign(); err != nil {
		log.Printf("close campaigns error: %v", err)
	}
}

func (j *CampaignJob) RegisterJobs(ctx context.Context) {

	go func() {
		for {
			next := nextRun(time.Now(), 18, 33)
			timer := time.NewTimer(time.Until(next))

			select {
			case <-timer.C:
				j.Run()
			case <-ctx.Done():
				timer.Stop()
				return
			}
		}
	}()
}

func nextRun(now time.Time, hour, min int) time.Time {
	next := time.Date(now.Year(), now.Month(), now.Day(), hour, min, 0, 0, now.Location())
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	return next
}

func (j *CampaignJob) StartPendingCampaign() error {

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()


	if err := j.campaignUsecase.StartCampaign(ctx); err != nil {
		log.Printf("start pending campaign failed: %v", err)
	}

	return nil
}

func (j *CampaignJob) notifyH3() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	notified, errs := j.campaignUsecase.NotifyEndingSoonCampaigns(ctx)
	for _, err := range errs {
		log.Printf("H-3 notify error: %v", err)
	}
	log.Printf("H-3 notify finished: %d campaign(s) notified, %d error(s)", notified, len(errs))
	return nil
}

func (j *CampaignJob) closeFinishedCampaign() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	closed, errs := j.campaignUsecase.CloseEndedCampaigns(ctx)
	for _, err := range errs {
		log.Printf("close campaign error: %v", err)
	}
	log.Printf("close finished: %d campaign(s) closed, %d error(s)", closed, len(errs))
	return nil
}
