This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CI/CD

Every push to `main` automatically builds, tests, and deploys to Cloud Run via a Cloud Build GitHub trigger using `cloudbuild.yaml`.

Pipeline steps (in order):

1. Install npm deps + `prisma generate`
2. Run `npm run lint` and `npm test` in parallel — fail = no deploy
3. Build Docker image tagged with `$COMMIT_SHA`
4. Push image to Artifact Registry (`cloud-run-source-deploy/jobtracker`)
5. Deploy new Cloud Run revision **with `--no-traffic`** (zero-impact)
6. Update `jobtracker-migrate` job to the new image
7. Execute the migrate job and wait
8. Promote the new revision to 100% traffic — only if migrations succeeded

If steps 1–7 fail, prod keeps serving the previous good revision. No partial deploys.

Trigger config (set in GCP Console → Cloud Build → Triggers):

- Region: `us-central1`
- Event: push to branch `^main$`
- Config: `cloudbuild.yaml` (in repo)
- Service account: default Cloud Build SA

Required IAM on the Cloud Build service account (`<PROJECT_NUMBER>@cloudbuild.gserviceaccount.com`):

- `roles/run.admin`
- `roles/iam.serviceAccountUser`
- `roles/artifactregistry.writer`
- `roles/secretmanager.secretAccessor` (only if app uses Secret Manager)

### Manual deploy (fallback)

If the trigger is disabled or you need to ship from your laptop:

```bash
gcloud run deploy jobtracker --source . --region us-central1 --allow-unauthenticated
IMAGE=$(gcloud run services describe jobtracker --region us-central1 \
  --format="value(spec.template.spec.containers[0].image)")
gcloud run jobs update jobtracker-migrate --region us-central1 --image $IMAGE
gcloud run jobs execute jobtracker-migrate --region us-central1 --wait
```
