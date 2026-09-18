<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 10: Deploy to Netlify

**What to build:** The app runs at the URL Netlify assigns from the default branch, and a second deploy is one merge to `main`.

**Blocked by:** 01.

**Status:** ready

## Steps, in order

1. Create the site on Netlify. With the CLI: `netlify login`, then `netlify init` in the repository and choose to create a new site linked to the GitHub repository `IBatsios/map-data-structures`. Without the CLI: in the Netlify console, add a new site, import it from GitHub, and pick that repository. Either way, set the build command to `bun run build` and the publish directory to `dist`, Astro's static output folder. Netlify installs bun when it finds the bun lockfile in the repo; confirm this with the user on the first build log. This is a human step because it needs the Netlify and GitHub accounts.
2. `.env.example` has no variables, so there is nothing to set in the site's environment settings. Production secrets live in: none needed. The site is static with no backend and no integrations, so there are no production secrets. Netlify holds only build settings.
3. Deploy once from the default branch and walk "Upload JSON get a drawing back" on the live URL.
4. Write the deploy procedure into `README.md`: a merge to `main` triggers a Netlify build; the console shows the log.

## Acceptance criteria

- [ ] Reachable at the URL Netlify assigns.
- [ ] "Upload JSON get a drawing back" works on the live URL.
- [ ] No secret is in the repository; there are none to put in the target's settings.
- [ ] A deploy from the default branch is repeatable, and `README.md` says how.

## Notes

No domain was given in the intake. When one exists, attach it to the site in Netlify's domain settings and create the DNS record it shows, then add the domain to the intake and regenerate.
