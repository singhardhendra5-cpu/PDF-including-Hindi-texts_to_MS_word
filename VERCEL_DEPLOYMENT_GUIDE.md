# Vercel Deployment Guide - PDF to Word Converter

This guide walks you through deploying the PDF to Word Converter application to Vercel, a modern serverless platform perfect for full-stack applications.

## Prerequisites

Before starting, ensure you have:
- GitHub account with the repository: `https://github.com/singhardhendra5-cpu/PDF-including-Hindi-texts-_to_MS_word`
- Vercel account (free at https://vercel.com)
- MySQL database (we'll use PlanetScale for free managed database)
- AWS S3 account for file storage (or alternative cloud storage)
- All required API keys and credentials

## Step 1: Create a Vercel Account

1. Go to https://vercel.com/signup
2. Click "Continue with GitHub"
3. Authorize Vercel to access your GitHub account
4. Complete the signup process

## Step 2: Set Up Database (PlanetScale)

PlanetScale provides free MySQL hosting, perfect for this application.

### Create PlanetScale Account
1. Go to https://planetscale.com/
2. Sign up with GitHub
3. Create a new database:
   - Name: `pdf-to-word-converter`
   - Region: Choose closest to your users
4. Click "Create database"

### Get Connection String
1. In PlanetScale dashboard, click your database
2. Click "Connect" button
3. Select "Node.js" from dropdown
4. Copy the connection string (looks like: `mysql://user:password@host/database`)
5. Save this as your `DATABASE_URL`

## Step 3: Set Up AWS S3 for File Storage

### Create S3 Bucket
1. Go to https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. Bucket name: `pdf-to-word-converter-{your-username}` (must be globally unique)
4. Region: Choose closest to your users
5. Click "Create bucket"

### Create IAM User for S3 Access
1. Go to https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. Username: `pdf-converter-app`
4. Click "Next"
5. Click "Attach policies directly"
6. Search for "S3" and select `AmazonS3FullAccess`
7. Click "Create user"

### Get Access Keys
1. Click the new user
2. Click "Security credentials" tab
3. Click "Create access key"
4. Select "Application running outside AWS"
5. Click "Next"
6. Copy `Access Key ID` and `Secret Access Key`
7. Save these securely

## Step 4: Deploy to Vercel

### Connect GitHub Repository
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Paste your repository URL: `https://github.com/singhardhendra5-cpu/PDF-including-Hindi-texts-_to_MS_word`
5. Click "Continue"
6. Vercel will detect it's a Node.js project
7. Click "Deploy"

### Configure Environment Variables
After clicking Deploy, you'll be taken to the project settings. Add all environment variables:

**Database:**
- `DATABASE_URL`: Your PlanetScale connection string

**AWS S3:**
- `AWS_ACCESS_KEY_ID`: From IAM user
- `AWS_SECRET_ACCESS_KEY`: From IAM user
- `AWS_REGION`: `us-east-1` (or your chosen region)
- `AWS_S3_BUCKET`: Your bucket name

**OAuth & API Keys:**
- `JWT_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`)
- `VITE_APP_ID`: Your OAuth app ID
- `OAUTH_SERVER_URL`: Your OAuth server URL
- `VITE_OAUTH_PORTAL_URL`: Your OAuth portal URL
- `OWNER_OPEN_ID`: Your user ID
- `OWNER_NAME`: Your name
- `BUILT_IN_FORGE_API_URL`: Manus API URL
- `BUILT_IN_FORGE_API_KEY`: Manus API key
- `VITE_FRONTEND_FORGE_API_KEY`: Frontend API key
- `VITE_FRONTEND_FORGE_API_URL`: Frontend API URL

**Application:**
- `VITE_APP_TITLE`: "PDF to Word Converter"
- `NODE_ENV`: `production`

## Step 5: Configure Production Database

### Run Database Migrations
1. After deployment, Vercel will show your deployment URL
2. The database migrations will run automatically during build
3. Check the build logs to ensure no errors

### Verify Database Connection
1. In Vercel dashboard, click your project
2. Go to "Deployments" tab
3. Click the latest deployment
4. Check "Logs" for any database errors
5. If successful, you'll see "Database connected"

## Step 6: Test Production Deployment

### Test the Application
1. Click "Visit" in Vercel dashboard to open your live app
2. Test file upload functionality
3. Test PDF conversion
4. Check conversion history
5. Verify downloads work

### Test Authentication
1. Click "Sign In"
2. Complete OAuth flow
3. Verify you can access protected features

### Monitor Performance
1. In Vercel dashboard, go to "Analytics"
2. Monitor response times and error rates
3. Check "Functions" for serverless function performance

## Step 7: Set Up Custom Domain (Optional)

### Add Custom Domain
1. In Vercel dashboard, click your project
2. Go to "Settings" → "Domains"
3. Enter your custom domain
4. Follow DNS configuration instructions
5. Update your domain's DNS records
6. Wait for DNS propagation (can take up to 24 hours)

### Enable HTTPS
Vercel automatically provides free SSL certificates for all domains.

## Step 8: Set Up Monitoring & Alerts

### Enable Error Tracking
1. In Vercel dashboard, go to "Settings" → "Integrations"
2. Connect Sentry or similar error tracking service
3. This helps you catch production errors immediately

### Set Up Logs
1. Go to "Settings" → "Logs"
2. Configure log retention
3. Set up alerts for errors

## Troubleshooting

### Deployment Fails
**Problem**: Build fails during deployment
**Solution**: 
1. Check build logs in Vercel dashboard
2. Ensure all environment variables are set
3. Verify database connection string is correct
4. Check that all dependencies are in package.json

### Database Connection Error
**Problem**: "Cannot connect to database"
**Solution**:
1. Verify DATABASE_URL is correct
2. Check PlanetScale database is running
3. Ensure IP whitelist allows Vercel IPs
4. In PlanetScale, go to Settings → Networking → Allow all IPs

### File Upload Fails
**Problem**: "Failed to upload file to S3"
**Solution**:
1. Verify AWS credentials are correct
2. Check S3 bucket exists and is accessible
3. Ensure IAM user has S3 permissions
4. Check bucket policy allows uploads

### High Memory Usage
**Problem**: Serverless function runs out of memory
**Solution**:
1. Increase function memory in vercel.json (currently 3008MB)
2. Optimize image processing
3. Implement file chunking for large uploads

## Performance Optimization

### Caching
Vercel automatically caches static assets. For dynamic content:
1. Set appropriate Cache-Control headers
2. Use Vercel's edge caching for API responses

### Database Optimization
1. Add indexes to frequently queried columns
2. Use connection pooling (PlanetScale handles this)
3. Monitor slow queries in PlanetScale dashboard

### File Storage
1. Use S3 CloudFront for faster file delivery
2. Set appropriate expiration for presigned URLs
3. Clean up old files regularly

## Security Best Practices

### Environment Variables
- Never commit `.env` files to GitHub
- Use Vercel's environment variable UI
- Rotate secrets regularly

### Database
- Use strong passwords
- Enable SSL connections (PlanetScale default)
- Regular backups (PlanetScale handles this)

### File Storage
- Use presigned URLs with expiration
- Validate file types server-side
- Implement rate limiting

### HTTPS
- All connections are HTTPS by default
- Enable HSTS headers
- Keep dependencies updated

## Monitoring & Maintenance

### Daily Tasks
- Check Vercel dashboard for errors
- Monitor error tracking service
- Review application logs

### Weekly Tasks
- Check database performance
- Review S3 storage usage
- Monitor API response times

### Monthly Tasks
- Rotate API keys
- Review security logs
- Update dependencies
- Backup database

## Cost Estimation

**Vercel**: Free tier covers most use cases
- Includes 100GB bandwidth/month
- 12 serverless function invocations/month
- Unlimited projects

**PlanetScale**: Free tier includes
- 5GB storage
- Unlimited queries
- Good for development/small production

**AWS S3**: Pay-as-you-go
- $0.023 per GB stored
- $0.0004 per 10,000 requests
- Estimate: $1-5/month for small usage

**Total Monthly Cost**: $0-10 for small to medium usage

## Getting Help

### Vercel Support
- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions
- Support: https://vercel.com/support

### PlanetScale Support
- Documentation: https://planetscale.com/docs
- Community: https://discord.gg/planetscale

### AWS Support
- Documentation: https://docs.aws.amazon.com/
- Support Center: https://console.aws.amazon.com/support/

## Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure custom domain
3. Enable analytics
4. Set up automated backups
5. Create deployment documentation for your team
6. Plan for scaling as usage grows

Congratulations! Your PDF to Word Converter is now live on Vercel! 🎉
