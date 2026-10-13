package repository

import (
    "context"
    "fmt"
    "io"
    "time"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type StorageRepository interface {
    Upload(ctx context.Context, key string, body io.Reader, size int64, contentType string) error
    Delete(ctx context.Context, key string) error
    GetPublicURL(key string) string
    GetPresignedURL(ctx context.Context, key string, expiry time.Duration) (string, error)
}

type r2StorageRepository struct {
    client     *s3.Client
    bucketName string
    publicBase string
}

func NewStorageRepository(client *s3.Client, bucketName, publicBase string) StorageRepository {
    return &r2StorageRepository{
        client:     client,
        bucketName: bucketName,
        publicBase: publicBase,
    }
}

func (r *r2StorageRepository) Upload(ctx context.Context, key string, body io.Reader, size int64, contentType string) error {
    _, err := r.client.PutObject(ctx, &s3.PutObjectInput{
        Bucket:        aws.String(r.bucketName),
        Key:           aws.String(key),
        Body:          body,
        ContentLength: aws.Int64(size),
        ContentType:   aws.String(contentType),
        ACL:           types.ObjectCannedACLPublicRead,
    })
    fmt.Println(err)
    return err
}

func (r *r2StorageRepository) Delete(ctx context.Context, key string) error {
    _, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
        Bucket: aws.String(r.bucketName),
        Key:    aws.String(key),
    })
    return err
}

func (r *r2StorageRepository) GetPublicURL(key string) string {
    return fmt.Sprintf("%s/%s", r.publicBase, key)
}

func (r *r2StorageRepository) GetPresignedURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
    presignClient := s3.NewPresignClient(r.client)
    req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
        Bucket: aws.String(r.bucketName),
        Key:    aws.String(key),
    }, s3.WithPresignExpires(expiry))
    if err != nil {
        return "", err
    }
    return req.URL, nil
}