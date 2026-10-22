package smtp

import (
	"bytes"
	"fmt"
	"net/smtp"
	"net/mail"
	
	"github.com/SamuelLazuardy/investment/internal/domain"
)

type Config struct {
	Host     string
	Port     int
	Username string
	Password string
	From string
}

type Sender struct {
	cfg  Config
	auth smtp.Auth
}

var _ domain.EmailSender = (*Sender)(nil)

func NewSender(cfg Config) *Sender {
	return &Sender{
		cfg:  cfg,
		auth: smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host),
	}
}

func (s *Sender) Send(email domain.Email) error {
	from := email.From
	if from.Address == "" {
		from = mail.Address{Address: s.cfg.From}
	}

	var msg bytes.Buffer
	msg.WriteString(fmt.Sprintf("From: %s\r\n", from.String()))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", joinAddresses(email.To)))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", email.Subject))
	contentType := "text/plain"
	if email.HTML {
		contentType = "text/html"
	}
	msg.WriteString(fmt.Sprintf("MIME-Version: 1.0\r\nContent-Type: %s; charset=\"utf-8\"\r\n", contentType))
	msg.WriteString("\r\n" + email.Body)

	recipients := make([]string, len(email.To))
	for i, t := range email.To {
		recipients[i] = t.Address
	}

	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	return smtp.SendMail(addr, s.auth, from.Address, recipients, msg.Bytes())
}

func joinAddresses(addrs []mail.Address) string {
	s := ""
	for i, a := range addrs {
		if i > 0 {
			s += ", "
		}
		s += a.String()
	}
	return s
}