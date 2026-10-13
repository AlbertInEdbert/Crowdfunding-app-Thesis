package jobs

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/SamuelLazuardy/investment/internal/usecase"
	// "github.com/robfig/cron/v3"
	// "gorm.io/gorm"
)

type CampaignJob struct {
	// db     *gorm.DB
	campaignUsecase usecase.CampaignUsecase
	// sender *Sender 
}

func NewCampaignJob(campaignUsecase usecase.CampaignUsecase) *CampaignJob {
	return &CampaignJob{campaignUsecase : campaignUsecase}
}

func (j *CampaignJob) Run() {
	// if err := j.notifyH3(); err != nil {
	// 	log.Printf("H-3 notify error: %v", err)
	// }
	fmt.Println(time.Now())
	if err := j.StartPendingCampaign(); err != nil {
		log.Printf("start campaigns error: %v", err)
	}
}

func (j *CampaignJob) RegisterJobs(ctx context.Context) {
	// go func() {
	// 	j.Run() 

	// 	ticker := time.NewTicker(1 * time.Minute)
	// 	defer ticker.Stop()
	// 	for range ticker.C {
	// 		j.Run()
	// 	}
	// }()
	go func() {
		for {
			next := nextRun(time.Now(), 14, 10)
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

// func (j *CampaignJob) notifyH3() error {
// 	from := time.Now().Add(72 * time.Hour)
// 	to := time.Now().Add(78 * time.Hour)

// 	var campaigns []Campaign
// 	if err := j.db.
// 		Where("status = ? AND h3_notified = ? AND end_date BETWEEN ? AND ?",
// 			"active", false, from, to).
// 		Find(&campaigns).Error; err != nil {
// 		return err
// 	}

// 	for _, c := range campaigns {
// 		if err := j.sendH3Emails(c); err != nil {
// 			log.Printf("H-3 email failed for campaign %d: %v", c.ID, err)
// 			continue // don't mark notified — will retry next hour
// 		}
// 		// Mark as notified (only if email succeeded)
// 		if err := j.db.Model(&Campaign{}).
// 			Where("id = ?", c.ID).
// 			Update("h3_notified", true).Error; err != nil {
// 			return err
// 		}
// 		log.Printf("H-3 emails sent for campaign %d", c.ID)
// 	}
// 	return nil
// }

// func (j *CampaignJob) sendH3Emails(c Campaign) error {

// 	var users []User
// 	if err := j.db.
// 		Table("users").
// 		Joins("JOIN investments ON investments.user_id = users.id").
// 		Where("investments.campaign_id = ?", c.ID).
// 		Group("users.id").
// 		Find(&users).Error; err != nil {
// 		return err
// 	}

// 	for _, u := range users {
// 		if err := j.sender.Send(u.Email,
// 			"Only 3 days left to invest in "+c.Name,
// 			"h3_reminder",
// 			map[string]any{
// 				"Name":   u.Name,
// 				"Campaign": c.Name,
// 				"DaysLeft": 3,
// 			}); err != nil {
// 			return err
// 		}
// 	}
// 	return nil
// }

// func (j *CampaignJob) closeFinished() error {
// 	var campaigns []Campaign
// 	if err := j.db.
// 		Where("status = ? AND end_date <= ?", "active", time.Now()).
// 		Find(&campaigns).Error; err != nil {
// 		return err
// 	}

// 	for _, c := range campaigns {
// 		if err := j.closeCampaign(c); err != nil {
// 			log.Printf("failed to close campaign %d: %v", c.ID, err)
// 		}
// 	}
// 	return nil
// }

// func (j *CampaignJob) closeCampaign(c Campaign) error {
// 	var total struct{ Sum int64 }
// 	if err := j.db.Model(&Investment{}).
// 		Where("campaign_id = ?", c.ID).
// 		Select("COALESCE(SUM(amount), 0) as sum").
// 		Scan(&total).Error; err != nil {
// 		return err
// 	}

// 	// All DB changes in ONE transaction
// 	return j.db.Transaction(func(tx *gorm.DB) error {
// 		// Atomically claim the campaign so two job runs don't race
// 		res := tx.Model(&Campaign{}).
// 			Where("id = ? AND status = ?", c.ID, "active").
// 			Updates(map[string]any{
// 				"status":        finalStatus(total.Sum, c.GoalAmount),
// 				"funded_amount": total.Sum,
// 				"closed_at":     time.Now(),
// 			})
// 		if res.Error != nil {
// 			return res.Error
// 		}
// 		if res.RowsAffected == 0 {
// 			return errors.New("campaign already closed (race prevented)")
// 		}

// 		// Optional: any other closing logic here —
// 		// e.g. generate share certificates, trigger payout webhooks...
// 		return nil
// 	})
// }

// func finalStatus(funded, goal int64) string {
// 	if funded >= goal {
// 		return "closed"
// 	}
// 	return "failed"
// }