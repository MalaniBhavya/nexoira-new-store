# Previewing the Nexoira Theme in Your Shopify Store

This guide walks you through connecting this GitHub repository to your real
Shopify store and previewing it **safely** — without affecting the theme
your customers currently see.

It's written for someone who has never used the Terminal or Shopify CLI
before, on a Mac.

**The short version:** everything below adds a *new, separate* theme to
your store's theme library. Your live storefront keeps running on your
current theme the entire time. Nothing here can go live unless you
deliberately click "Publish" — and this guide tells you exactly how to
avoid that until you're ready.

---

## 1. What you need before starting

- A Mac with an internet connection.
- Admin access (owner or staff account with theme permissions) to your
  Shopify store.
- Your store's `.myshopify.com` address (e.g. `nexoira.myshopify.com`).
  You can find this in Shopify Admin → Settings → Domains, or it's the
  URL you use to log into `admin.shopify.com`.
- About 20–30 minutes.

You do **not** need to know how to code. You'll be copy-pasting commands
into the Terminal app.

### Is the Shopify CLI required?

Yes. The Shopify CLI (Command Line Interface) is Shopify's own official
tool for uploading theme code to a store and generating safe preview
links. It's free, made by Shopify, and is the standard way developers
push themes — there's no way around installing it for this workflow.

---

## 2. Install the required software

Open the **Terminal** app on your Mac (press `Cmd + Space`, type
`Terminal`, hit Enter). You'll paste each command below one at a time and
press Enter after each.

### 2.1 Install Homebrew (a package installer for Mac)

Check if you already have it:

```bash
brew --version
```

If you see a version number, skip to 2.2. If you see "command not found",
install it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow any on-screen instructions (it may ask for your Mac password —
that's normal, nothing is shown as you type it). When it finishes, it
usually prints two more commands to run to finish setup — run those too if
shown.

### 2.2 Install Git (needed to download this repository)

Check first:

```bash
git --version
```

Macs almost always have Git already. If not:

```bash
brew install git
```

### 2.3 Install Node.js (needed to run the Shopify CLI)

```bash
brew install node
```

Verify it worked:

```bash
node --version
```

You should see something like `v20.x.x` or higher.

### 2.4 Install the Shopify CLI

```bash
npm install -g @shopify/cli @shopify/theme
```

Verify it worked:

```bash
shopify version
```

You should see a version number. If you get a "command not found" error,
close Terminal completely and reopen it, then try again.

---

## 3. Download this theme to your Mac

Pick a simple location, like your Desktop:

```bash
cd ~/Desktop
git clone https://github.com/MalaniBhavya/nexoira-new-store.git
cd nexoira-new-store
```

You should now be "inside" the theme folder in Terminal. Every command
from here on assumes you're still in this folder — if you ever close
Terminal and reopen it, run `cd ~/Desktop/nexoira-new-store` again first.

To confirm you're on the right branch:

```bash
git branch
```

You should see `claude/nexoira-shopify-theme-ucin3o` (it may or may not
have a `*` next to it depending on what the repo's default branch is —
if it's not the current branch, switch to it):

```bash
git checkout claude/nexoira-shopify-theme-ucin3o
```

---

## 4. Connect to your Shopify store

You don't need a separate login step — the CLI will open your browser to
log in automatically the first time you run a theme command. Just make
sure you know your store's address (e.g. `nexoira.myshopify.com`).

---

## 5. Preview the theme safely

There are two ways to preview. **Start with Option A** — it's the
fastest way to see it working. Use **Option B** once you want a
preview link that persists and that you can also open in the Shopify
Theme Editor (Customizer).

### Option A — Quick live preview (`theme dev`)

This is the fastest way to see the theme, with live-reload as changes are
made. It creates a **temporary** theme on your store that is not visible
to your customers and is automatically deleted when you stop it.

```bash
shopify theme dev --store=your-store-name.myshopify.com
```

(Replace `your-store-name.myshopify.com` with your real store address.)

The first time you run this, a browser window will open asking you to log
into Shopify — log in with your store admin account and approve access.

Once it connects, Terminal will print something like:

```
Preview your theme: https://your-store-name.myshopify.com/?preview_theme_id=123456789
```

Open that link in your browser — that's your live, working preview. You
can share this exact link with anyone (like a business partner) and they
can view it too, without needing Shopify access. **Regular visitors to
your store will not see this theme** — they'll keep seeing your current
live theme.

To stop the preview, go back to Terminal and press `Control + C`. This
deletes the temporary theme from your store — it does not delete
anything from this GitHub repo or your computer.

### Option B — Push a persistent, unpublished theme (recommended before showing others)

This uploads the theme as a real (but unpublished) entry in your store's
theme library, so it's there whenever you open Shopify Admin — even after
you close Terminal or restart your Mac.

```bash
shopify theme push --unpublished --store=your-store-name.myshopify.com --theme=Nexoira
```

What each part does:
- `--unpublished` — explicitly tells Shopify **not** to make this the
  live theme. This is the key safety flag.
- `--theme=Nexoira` — names the theme so you can recognize it in your
  admin. Feel free to change the name.

When it finishes, Terminal will print a preview link and an editor link,
something like:

```
View your theme: https://your-store-name.myshopify.com/?preview_theme_id=123456789
Customize your theme in the Theme Editor: https://your-store-name.myshopify.com/admin/themes/123456789/editor
```

- The first link is the same kind of safe preview link as before — open
  it, or share it.
- The second link opens the **Theme Editor** (Customizer) for this theme
  specifically, where you can add products, adjust images/text in
  sections, and click around — all without touching your live theme.

---

## 6. Confirm it's unpublished (and keep it that way while testing)

In Shopify Admin:

1. Go to **Online Store → Themes**.
2. Your current live theme is shown at the top under "Current theme."
3. Scroll down to the **"Theme library"** section — you'll see **Nexoira**
   listed there as an unpublished theme, with buttons for **Customize**,
   **Preview**, **Duplicate**, and a **"…"** menu with **Publish**,
   **Rename**, **Delete**.

**While testing: do not click "Publish."** That is the only action that
makes a theme live. Everything else (Preview, Customize, sharing the
preview link) is completely safe and reversible.

---

## 7. Making changes after this initial preview

If more design work happens in this GitHub repository later, you (or
Claude) can pull the latest changes and push them again the same way:

```bash
cd ~/Desktop/nexoira-new-store
git pull origin claude/nexoira-shopify-theme-ucin3o
shopify theme push --unpublished --store=your-store-name.myshopify.com --theme=Nexoira
```

This updates the same "Nexoira" unpublished theme in your library — it
won't create duplicates as long as you run it from inside a folder that's
already connected to that theme (the CLI remembers this automatically
after the first push).

---

## 8. When you're ready to go live

Only do this when you've fully reviewed the preview and are confident.

**Option 1 — From Shopify Admin (recommended, has a confirmation step):**
1. Online Store → Themes.
2. Find "Nexoira" in the Theme library.
3. Click the **"…"** menu next to it → **Publish**.
4. Shopify will ask you to confirm. Confirm, and it becomes your live
   storefront immediately.

**Option 2 — From Terminal:**

```bash
shopify theme publish --store=your-store-name.myshopify.com
```

This will list your themes and ask you to pick which one to publish —
choose "Nexoira."

Your previous live theme is **not deleted** when you do this — Shopify
keeps it in your Theme library so you can switch back instantly if
needed.

---

## 9. Troubleshooting

**"command not found: brew" / "command not found: node" / "command not
found: shopify"**
Close Terminal completely (Cmd+Q) and reopen it, then try the command
again. If it still fails, re-run the install command for that specific
tool from section 2.

**Browser login window doesn't open, or login seems stuck**
Run `shopify auth logout` then try your `shopify theme dev` or
`shopify theme push` command again.

**"You are not authorized to perform this action"**
Your Shopify staff account needs theme permissions. Ask the store owner
to grant you access under Settings → Users and permissions, or have the
owner run these commands themselves.

**Nothing shows up when I open the preview link**
Double check you copied the *entire* link, including the
`?preview_theme_id=...` part at the end.

---

## Summary — the safety guarantee

- Cloning this repo to your Mac: **affects nothing** on Shopify.
- `shopify theme dev`: creates a **temporary** preview, auto-deleted when
  you stop it. **Never** affects your live theme.
- `shopify theme push --unpublished`: adds a **new, separate,
  unpublished** theme to your store. **Never** affects your live theme.
- The only action that changes what your customers see is explicitly
  clicking **Publish** (in Admin) or running `shopify theme publish` and
  confirming — both require a deliberate choice on your part.
