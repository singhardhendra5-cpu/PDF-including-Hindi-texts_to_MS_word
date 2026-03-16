# Vercel Deployment - Quick Start (5 Minutes)

Follow these steps to deploy your PDF to Word Converter to Vercel in just 5 minutes!

## Step 1: Create Vercel Account (1 minute)

1. Go to https://vercel.com/signup
2. Click "Continue with GitHub"
3. Complete the signup

## Step 2: Deploy to Vercel (2 minutes)

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Paste: `https://github.com/singhardhendra5-cpu/PDF-including-Hindi-texts-_to_MS_word`
5. Click "Continue"
6. Click "Deploy"

Vercel will start building your project. This takes about 2-3 minutes.

## Step 3: Add Environment Variables (2 minutes)

While Vercel is building, get these values ready:

**From Manus (if using Manus OAuth):**
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `OWNER_OPEN_ID`
- `OWNER_NAME`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`

**Generate these:**
- `JWT_SECRET`: Run `openssl rand -base64 32` in terminal

**For Database (PlanetScale):**
- Create free account at https://planetscale.com
- Create database named `pdf-to-word-converter`
- Get connection string (looks like: `mysql://user:password@host/database`)
- Set as `DATABASE_URL`

**For File Storage (AWS S3):**
- Create free AWS account at https://aws.amazon.com
- Create S3 bucket
- Create IAM user with S3 access
- Get `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Set `AWS_REGION` and `AWS_S3_BUCKET`

After deployment completes:

1. Go to "Settings" → "Environment Variables"
2. Add all the variables above
3. Click "Save"
4. Vercel will automatically redeploy with the new variables

## Step 4: Verify Deployment

1. Click "Visit" to open your live application
2. Test uploading a PDF file
3. Verify conversion works
4. Check conversion history

**Done!** Your app is now live on Vercel! 🎉

## What's Next?

- **Custom Domain**: Go to Settings → Domains to add your own domain
- **Monitoring**: Check Analytics tab to monitor usage
- **Logs**: Go to Deployments → Logs to see application logs
- **Scaling**: Vercel automatically scales based on traffic

## Troubleshooting

**Deployment Failed?**
- Check build logs in Deployments tab
- Ensure all environment variables are set
- Verify database connection string is correct

**App Shows Blank Page?**
- Check browser console for errors (F12)
- Verify environment variables are correct
- Check Vercel logs for backend errors

**File Upload Not Working?**
- Verify AWS S3 credentials are correct
- Check S3 bucket exists and is accessible
- Ensure IAM user has S3 permissions

## Cost

- **Vercel**: Free tier (includes 100GB bandwidth/month)
- **PlanetScale**: Free tier (5GB storage)
- **AWS S3**: Pay-as-you-go (~$1-5/month for small usage)

**Total**: Usually free or very cheap for small to medium usage!

## Need Help?

- Full guide: See `VERCEL_DEPLOYMENT_GUIDE.md`
- Vercel docs: https://vercel.com/docs
- PlanetScale docs: https://planetscale.com/docs
- AWS docs: https://docs.aws.amazon.com/
