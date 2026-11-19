# kallekarlsson1.github.io

Personal site. Plain Jekyll, no theme. One scrolling home page with sections; blog posts are separate pages.

- Name, one-line bio and nav: `_config.yml` (`title`, `description`, `nav`; nav urls are `/#<section id>`)
- Home page sections: `_includes/sections/` (`about`, `projects`, `cv`, `blog`, `contact`), ordered in `index.html`
- Posts: `_posts/` (set `published: true` to show one; they're listed in the Blog section)
- Old `/cv/`, `/projects/`, `/contact/`, `/blog/` URLs redirect to the matching section
- Look: `assets/css/style.css`
- Windswept tree background (moves with scrolling): `assets/js/wind.js`; top bar behaviour: `assets/js/nav.js`

Run locally: `bundle install && bundle exec jekyll serve` → http://localhost:4000
