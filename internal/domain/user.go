package domain

import (
	"time"
)

type User struct {
	ID          uint32    `gorm:"primaryKey;column:id;type:integer"`
	Email       string    `gorm:"type:varchar(255);not null"`
	Name        string    `gorm:"type:varchar(255);not null"`
	Password    string    `gorm:"type:varchar(255);not null"`
	PhoneNumber string    `gorm:"column:phone_number;type:varchar(255)"`
	TxCounter   int64     `gorm:"column:tx_counter;type:bigint;not null;default:0"`
	RoleID      uint32    `gorm:"column:roleid;type:integer"`
	CreatedAt   time.Time `gorm:"column:created_at;type:timestamp"`
	UpdatedAt   time.Time `gorm:"column:updated_at;type:timestamp"`

	Role               *Role               `gorm:"foreignKey:RoleID"`
	UserAuthentication *UserAuthentication `gorm:"foreignKey:UserID"`
	Company            *Company            `gorm:"foreignKey:UserID"`
	Investments        []InvestmentsH      `gorm:"foreignKey:UserID"`
	ShareOwnerships    []ShareOwnership    `gorm:"foreignKey:UserID"`
}

func (User) TableName() string {
	return "user"
}
