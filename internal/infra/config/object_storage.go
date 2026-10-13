package config

import (
    "fmt"
    "os"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageConfig struct {
    AccountID       string
    AccessKeyID     string
    AccessKeySecret string
    BucketName      string
    PublicURLBase   string 
}

func LoadStorageConfig() StorageConfig {
    return StorageConfig{
        AccountID:       os.Getenv("R2_ACCOUNT_ID"),
        AccessKeyID:     os.Getenv("R2_ACCESS_KEY_ID"),
        AccessKeySecret: os.Getenv("R2_SECRET_ACCESS_KEY"),
        BucketName:      os.Getenv("R2_BUCKET_NAME"),
        // PublicURLBase:   os.Getenv("CDN_BASE_URL"),
    }
}

func NewR2Client(cfg StorageConfig) *s3.Client {
    r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
        return aws.Endpoint{
            URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID),
        }, nil
    })

    awsCfg := aws.Config{
        Credentials: credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.AccessKeySecret, ""),
        EndpointResolverWithOptions: r2Resolver,
        Region: "auto",
    }

    return s3.NewFromConfig(awsCfg, func(o *s3.Options) {
        o.UsePathStyle = true 
    })
}