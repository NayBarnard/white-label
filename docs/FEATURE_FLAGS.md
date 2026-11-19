# Feature flag testing

Feature flags are disabled unless their value is exactly `true`. To test a feature locally, set its `NEXT_PUBLIC_FEATURE_*` variable to `"true"` in `.env.local`, then restart the development server. To test a preview deployment, set the same variable to `"true"` in the Vercel Preview environment and redeploy. Keep production flags off until the corresponding data, access controls, provider setup, and review workflows are ready.
