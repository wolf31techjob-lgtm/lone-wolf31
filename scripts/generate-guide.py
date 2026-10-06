#!/usr/bin/env python3
"""Generate a beginner-friendly deployment guide PDF for Store Update Monitor."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import os

OUTPUT_PATH = "/home/z/my-project/download/Store-Update-Monitor-Deployment-Guide.pdf"

# Colors
EMERALD = HexColor("#10b981")
DARK_GRAY = HexColor("#1f2937")
MEDIUM_GRAY = HexColor("#6b7280")
LIGHT_BG = HexColor("#f0fdf4")
CODE_BG = HexColor("#f3f4f6")
STEP_BLUE = HexColor("#3b82f6")
WARN_AMBER = HexColor("#f59e0b")

# Styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "CustomTitle", parent=styles["Title"],
    fontSize=24, textColor=EMERALD, spaceAfter=10, alignment=TA_CENTER,
    fontName="Helvetica-Bold",
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontSize=14, textColor=MEDIUM_GRAY, spaceAfter=20, alignment=TA_CENTER,
    fontName="Helvetica",
)
h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontSize=18, textColor=EMERALD, spaceBefore=20, spaceAfter=10,
    fontName="Helvetica-Bold",
)
h2_style = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontSize=14, textColor=DARK_GRAY, spaceBefore=15, spaceAfter=8,
    fontName="Helvetica-Bold",
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontSize=11, textColor=DARK_GRAY, spaceAfter=8, alignment=TA_LEFT,
    fontName="Helvetica", leading=16,
)
step_style = ParagraphStyle(
    "Step", parent=styles["Normal"],
    fontSize=11, textColor=DARK_GRAY, spaceAfter=6, alignment=TA_LEFT,
    fontName="Helvetica", leading=15,
    leftIndent=15, bulletIndent=5,
)
code_style = ParagraphStyle(
    "Code", parent=styles["Code"],
    fontSize=9, textColor=DARK_GRAY, spaceAfter=8,
    fontName="Courier", leading=13,
    backColor=CODE_BG, borderPadding=6,
    leftIndent=10, rightIndent=10,
)
warn_style = ParagraphStyle(
    "Warning", parent=styles["Normal"],
    fontSize=11, textColor=HexColor("#92400e"), spaceAfter=8,
    fontName="Helvetica-Bold", leading=15,
    backColor=HexColor("#fef3c7"), borderPadding=8,
    leftIndent=10, rightIndent=10,
)
tip_style = ParagraphStyle(
    "Tip", parent=styles["Normal"],
    fontSize=11, textColor=HexColor("#065f46"), spaceAfter=8,
    fontName="Helvetica", leading=15,
    backColor=LIGHT_BG, borderPadding=8,
    leftIndent=10, rightIndent=10,
)

def build_story():
    story = []

    # ---- Cover ----
    story.append(Spacer(1, 1.5 * inch))
    story.append(Paragraph("Store Update Monitor", title_style))
    story.append(Paragraph("Complete Deployment Guide for Beginners", subtitle_style))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(
        'This guide will walk you through deploying your Store Update Monitor '
        'as a live website — completely FREE. No coding experience needed.',
        ParagraphStyle("CoverBody", parent=body_style, alignment=TA_CENTER, fontSize=12)
    ))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(
        'Developed by: Mr. Raymond M. Reintegrado<br/>'
        'Contact: raymond.reintegrado@hiflyer.ca',
        ParagraphStyle("CoverFooter", parent=body_style, alignment=TA_CENTER, fontSize=10, textColor=MEDIUM_GRAY)
    ))
    story.append(PageBreak())

    # ---- Table of Contents ----
    story.append(Paragraph("Table of Contents", h1_style))
    toc_data = [
        ["1.", "What You Need Before Starting"],
        ["2.", "Step 1: Create a GitHub Account"],
        ["3.", "Step 2: Download and Install Git"],
        ["4.", "Step 3: Upload Your Code to GitHub"],
        ["5.", "Step 4: Create a Vercel Account (FREE)"],
        ["6.", "Step 5: Create a Neon Database (FREE)"],
        ["7.", "Step 6: Deploy on Vercel"],
        ["8.", "Step 7: Set Up the Database"],
        ["9.", "Step 8: Seed the Admin Account"],
        ["10.", "Step 9: Upload Your Excel File"],
        ["11.", "Troubleshooting Common Problems"],
        ["12.", "Cost Summary"],
    ]
    toc_table = Table(toc_data, colWidths=[0.5*inch, 5*inch])
    toc_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 12),
        ("TEXTCOLOR", (0, 0), (-1, -1), DARK_GRAY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # ---- Section 1 ----
    story.append(Paragraph("1. What You Need Before Starting", h1_style))
    story.append(Paragraph(
        "Before we begin, make sure you have the following ready. Everything listed here is completely FREE:",
        body_style
    ))
    items = [
        "<b>An email address</b> — you will use this to create accounts on GitHub, Vercel, and Neon.",
        "<b>A web browser</b> — Chrome, Firefox, Edge, or Safari will work fine.",
        "<b>The project files</b> — these are the files we built together. You should have them in a folder on your computer.",
        "<b>About 30-45 minutes</b> — the entire process takes less than an hour.",
        "<b>Your Excel file</b> — the store list Excel file that you normally upload to the app.",
    ]
    for item in items:
        story.append(Paragraph(f"• {item}", step_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        '<b>Important:</b> You do NOT need to know how to code. This guide will give you '
        'exact commands to copy and paste. Just follow each step in order.',
        tip_style
    ))

    # ---- Section 2 ----
    story.append(Paragraph("2. Step 1: Create a GitHub Account", h1_style))
    story.append(Paragraph(
        "GitHub is a website where programmers store their code. Think of it like Google Drive, "
        "but specifically for code files. We will use it to store your Store Update Monitor code.",
        body_style
    ))
    story.append(Paragraph("Instructions:", h2_style))
    steps = [
        "Open your web browser and go to <b>https://github.com/signup</b>",
        "Enter your email address and click <b>Continue</b>",
        "Create a password and click <b>Continue</b>",
        "Choose a username (e.g., <b>raymond2026</b>) and click <b>Continue</b>",
        "Solve the puzzle to verify you are human",
        "Check your email for a verification code from GitHub and enter it",
        "Choose the <b>Free</b> plan (it is the default)",
        "Skip the optional questions (click <b>Skip personalization</b>)",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "You now have a GitHub account! Keep this window open — we will use it later.",
        tip_style
    ))

    # ---- Section 3 ----
    story.append(Paragraph("3. Step 2: Download and Install Git", h1_style))
    story.append(Paragraph(
        "Git is a tool that lets you upload files from your computer to GitHub. "
        "Think of it as the bridge between your computer and GitHub.",
        body_style
    ))
    story.append(Paragraph("For Windows:", h2_style))
    steps = [
        "Go to <b>https://git-scm.com/download/win</b>",
        "The download should start automatically. If not, click <b>Click here to download</b>",
        "Open the downloaded file (<b>Git-2.x.x-64-bit.exe</b>)",
        "Click <b>Next</b> through all the installation screens (keep all defaults)",
        "Click <b>Install</b> and wait for it to finish",
        "Click <b>Finish</b>",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))
    story.append(Paragraph("For Mac:", h2_style))
    steps = [
        "Open the <b>Terminal</b> app (press Command+Space, type Terminal, press Enter)",
        "Type: <b>git --version</b> and press Enter",
        "If Git is not installed, a popup will ask you to install it. Click <b>Install</b>",
        "Follow the on-screen instructions",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "To verify Git is installed, open Command Prompt (Windows) or Terminal (Mac) and type: "
        "<b>git --version</b>. You should see something like <b>git version 2.43.0</b>.",
        tip_style
    ))

    # ---- Section 4 ----
    story.append(Paragraph("4. Step 3: Upload Your Code to GitHub", h1_style))
    story.append(Paragraph(
        "Now we will upload all the Store Update Monitor files to GitHub. "
        "This is like saving your project to the cloud.",
        body_style
    ))
    story.append(Paragraph("4a. Create a new repository on GitHub:", h2_style))
    steps = [
        "Go to <b>https://github.com/new</b> (make sure you are logged in)",
        "In the <b>Repository name</b> field, type: <b>store-update-monitor</b>",
        "Select <b>Private</b> (so only you can see it)",
        "Check the box next to <b>Add a README file</b>",
        "Scroll down and click the green <b>Create repository</b> button",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))

    story.append(Paragraph("4b. Upload your project files:", h2_style))
    story.append(Paragraph(
        "Open Command Prompt (Windows) or Terminal (Mac) and run these commands. "
        "Replace <b>YOUR_USERNAME</b> with your actual GitHub username:",
        body_style
    ))
    story.append(Paragraph(
        "cd /path/to/your/project/folder<br/><br/>"
        "git init<br/>"
        "git add .<br/>"
        'git commit -m "Store Update Monitor"<br/><br/>'
        "git remote add origin https://github.com/YOUR_USERNAME/store-update-monitor.git<br/>"
        "git branch -M main<br/>"
        "git push -u origin main",
        code_style
    ))
    story.append(Paragraph(
        "Replace <b>/path/to/your/project/folder</b> with the actual path to your project. "
        "For example, if your project is on your Desktop, it might be: "
        "<b>C:\\Users\\YourName\\Desktop\\store-update-monitor</b>",
        warn_style
    ))
    story.append(Paragraph(
        "When prompted, enter your GitHub username and password. "
        "If GitHub asks for a password, you need to use a Personal Access Token instead of your password. "
        "Go to GitHub Settings > Developer settings > Personal access tokens > Generate new token (classic) > "
        "Check the 'repo' box > Generate token > Copy the token and paste it as your password.",
        warn_style
    ))

    # ---- Section 5 ----
    story.append(Paragraph("5. Step 4: Create a Vercel Account (FREE)", h1_style))
    story.append(Paragraph(
        "Vercel is a free website hosting service. It will turn your code into a live website "
        "that anyone can visit. Vercel is the company that created Next.js (the framework we used).",
        body_style
    ))
    steps = [
        "Go to <b>https://vercel.com/signup</b>",
        "Click <b>Continue with GitHub</b> (this links your GitHub account to Vercel)",
        "Authorize Vercel to access your GitHub account by clicking <b>Authorize Vercel</b>",
        "Answer the onboarding questions (select <b>Hobby</b> as your purpose)",
        "Your Vercel account is now ready!",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))

    # ---- Section 6 ----
    story.append(Paragraph("6. Step 5: Create a Neon Database (FREE)", h1_style))
    story.append(Paragraph(
        "Neon is a free PostgreSQL database service. This is where all your data will be permanently stored — "
        "stores, users, updates, and everything else. Unlike the local database we used during development, "
        "a Neon database is in the cloud and never gets erased.",
        body_style
    ))
    steps = [
        "Go to <b>https://neon.tech</b>",
        "Click <b>Sign Up</b> in the top right",
        "Click <b>Continue with GitHub</b> (or use email)",
        "Authorize Neon to access your GitHub account",
        "Create a new project:",
        "  - Project name: <b>store-update-monitor</b>",
        "  - Database name: <b>storemonitor</b>",
        "  - Region: Choose the one closest to you (e.g., <b>US East (Ohio)</b> for North America)",
        "  - Postgres version: <b>17</b> (or latest available)",
        "Click <b>Create project</b>",
        "You will see a <b>Connection String</b> that looks like this:",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))
    story.append(Paragraph(
        "postgresql://username:password@ep-xxx.region.aws.neon.tech/storemonitor?sslmode=require",
        code_style
    ))
    story.append(Paragraph(
        "<b>COPY this connection string</b> — you will need it in the next step. "
        "Save it in a text file or notepad. Treat it like a password — do not share it with anyone.",
        warn_style
    ))

    # ---- Section 7 ----
    story.append(Paragraph("7. Step 6: Deploy on Vercel", h1_style))
    story.append(Paragraph(
        "Now we will deploy your app to Vercel. This is the step that turns your code into a live website.",
        body_style
    ))
    steps = [
        "Go to <b>https://vercel.com/dashboard</b>",
        "Click <b>Add New</b> > <b>Project</b>",
        "Find <b>store-update-monitor</b> in the list and click <b>Import</b>",
        "On the Configure Project page, scroll down to <b>Environment Variables</b>",
        "Add the first variable:",
        "  - Key: <b>DATABASE_URL</b>",
        "  - Value: Paste your Neon connection string from Step 5",
        "  - Click <b>Add</b>",
        "Add a second variable:",
        "  - Key: <b>NEXTAUTH_SECRET</b>",
        "  - Value: Type any random text (e.g., <b>my-secret-key-2026</b>)",
        "  - Click <b>Add</b>",
        "Scroll down and click the <b>Deploy</b> button",
        "Wait 2-5 minutes for the build to complete. You will see a <b>Congratulations</b> screen when it is done!",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))
    story.append(Paragraph(
        "Your website is now LIVE! Vercel will give you a URL like: "
        "<b>https://store-update-monitor-xxx.vercel.app</b>. "
        "Click on it to see your website. But wait — the database is empty, so let us set it up next.",
        tip_style
    ))

    # ---- Section 8 ----
    story.append(Paragraph("8. Step 7: Set Up the Database", h1_style))
    story.append(Paragraph(
        "Before you can use the website, you need to create the database tables. "
        "Vercel can do this automatically.",
        body_style
    ))
    steps = [
        "Go to your Vercel project dashboard",
        "Click on the <b>Storage</b> tab at the top",
        "If Neon is not connected, click <b>Connect Database</b> and select your Neon database",
        "Go to the <b>Settings</b> tab",
        "Scroll down to <b>Build & Development Settings</b>",
        "In the <b>Build Command</b> field, add this before the existing command:",
        "  <b>npx prisma generate && npx prisma db push &&</b> (then the rest of the build command)",
        "Click <b>Save</b>",
        "Go to the <b>Deployments</b> tab",
        "Click the three dots (... next to your latest deployment) > <b>Redeploy</b>",
        "Wait for the build to complete. The database tables are now created!",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))
    story.append(Paragraph(
        "Alternatively, you can run the database setup from your computer using the Vercel CLI:",
        body_style
    ))
    story.append(Paragraph(
        "# Install Vercel CLI<br/>"
        "npm i -g vercel<br/><br/>"
        "# Login to Vercel<br/>"
        "vercel login<br/><br/>"
        "# Pull environment variables<br/>"
        "vercel env pull .env.production<br/><br/>"
        "# Create database tables<br/>"
        "npx prisma db push<br/><br/>"
        "# Seed the admin account<br/>"
        "npx tsx scripts/seed.ts",
        code_style
    ))

    # ---- Section 9 ----
    story.append(Paragraph("9. Step 8: Seed the Admin Account", h1_style))
    story.append(Paragraph(
        "The database needs at least one user (the System Admin) so you can log in. "
        "We have a seed script that does this automatically.",
        body_style
    ))
    story.append(Paragraph(
        "If you used the Vercel CLI method in Step 7, the seed script already ran. "
        "If not, run it now:",
        body_style
    ))
    story.append(Paragraph(
        "# Make sure you are in your project folder<br/>"
        "cd /path/to/your/project/folder<br/><br/>"
        "# Pull the production environment variables<br/>"
        "vercel env pull .env.production<br/><br/>"
        "# Run the seed script<br/>"
        "npx tsx scripts/seed.ts",
        code_style
    ))
    story.append(Paragraph(
        "You should see:<br/>"
        "<b>System Admin user ready: wolf sa</b><br/>"
        "<b>Welcome push update seeded</b><br/><br/>"
        "You can now log in with:<br/>"
        "<b>UserID:</b> wolf<br/>"
        "<b>Password:</b> wolf310809",
        tip_style
    ))

    # ---- Section 10 ----
    story.append(Paragraph("10. Step 9: Upload Your Excel File", h1_style))
    story.append(Paragraph(
        "Now that your website is live and the database is set up, you can upload your Excel file "
        "with the store list. This data will be permanently stored in the Neon database — "
        "it will NOT reset when you or other users access the site.",
        body_style
    ))
    steps = [
        "Open your live website URL (e.g., https://store-update-monitor-xxx.vercel.app)",
        "Log in with UserID: <b>wolf</b> and Password: <b>wolf310809</b>",
        "Click the <b>Upload Excel</b> button in the top-left area",
        "Check the <b>Replace all stores</b> checkbox (if this is your first upload, it does not matter)",
        "Click the drop zone and select your Excel file",
        "Wait for the upload to complete. You should see a success message.",
        "Your stores will now appear in the 3 area columns (Manitoba, Edmonton, Calgary)!",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", step_style))
    story.append(Paragraph(
        "Your store data is now permanently saved. Even if the server restarts, "
        "your data will still be there. The only way to clear it is to use the <b>Reset</b> button "
        "or upload a new Excel file with <b>Replace all stores</b> checked.",
        tip_style
    ))

    # ---- Section 11: Troubleshooting ----
    story.append(Paragraph("11. Troubleshooting Common Problems", h1_style))
    
    story.append(Paragraph("Problem: Build fails on Vercel", h2_style))
    story.append(Paragraph(
        "If the build fails, check the build logs in Vercel. Common causes:<br/>"
        "• Missing environment variables (make sure DATABASE_URL is set)<br/>"
        "• Prisma client not generated (add 'npx prisma generate' to the build command)<br/>"
        "• TypeScript errors (check that all files are uploaded correctly)",
        body_style
    ))

    story.append(Paragraph("Problem: Cannot log in after deployment", h2_style))
    story.append(Paragraph(
        "Make sure you ran the seed script (Step 8). If you did not, the database has no users "
        "and you cannot log in. Run: <b>npx tsx scripts/seed.ts</b> with the production DATABASE_URL.",
        body_style
    ))

    story.append(Paragraph("Problem: Database tables do not exist", h2_style))
    story.append(Paragraph(
        "Run: <b>npx prisma db push</b> with the production DATABASE_URL set in your environment. "
        "This creates all the required tables.",
        body_style
    ))

    story.append(Paragraph("Problem: Stores disappear after some time", h2_style))
    story.append(Paragraph(
        "This should NOT happen with Neon — the database is persistent. If stores disappear, "
        "check that your DATABASE_URL is pointing to the correct Neon database and not a local SQLite file.",
        body_style
    ))

    story.append(Paragraph("Problem: Need to update the code", h2_style))
    story.append(Paragraph(
        "If you need to make changes to the code (e.g., fix a bug), simply:<br/>"
        "1. Make the change on your computer<br/>"
        "2. Run: <b>git add .</b> and <b>git commit -m 'description of change'</b><br/>"
        "3. Run: <b>git push</b><br/>"
        "Vercel will automatically rebuild and deploy your site within minutes!",
        body_style
    ))

    story.append(Paragraph("Problem: Want to use a custom domain", h2_style))
    story.append(Paragraph(
        "1. Buy a domain (e.g., from Namecheap or Cloudflare, about $10/year)<br/>"
        "2. Go to Vercel > your project > Settings > Domains<br/>"
        "3. Add your domain<br/>"
        "4. Update the DNS records as instructed by Vercel<br/>"
        "5. Wait for DNS to propagate (can take up to 24 hours, usually 15 minutes)",
        body_style
    ))

    # ---- Section 12: Cost Summary ----
    story.append(Paragraph("12. Cost Summary", h1_style))
    
    cost_data = [
        ["Service", "Free Tier", "What It Does"],
        ["GitHub", "FREE forever", "Stores your code files"],
        ["Vercel", "FREE (100GB bandwidth/month)", "Hosts your website"],
        ["Neon", "FREE (0.5GB storage)", "Stores your database"],
        ["Domain (optional)", "$10/year (optional)", "Custom website address"],
        ["Total", "$0/month", "Everything you need is FREE"],
    ]
    cost_table = Table(cost_data, colWidths=[1.5*inch, 2*inch, 2.5*inch])
    cost_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
        ("BACKGROUND", (0, 1), (-1, -2), HexColor("#f9fafb")),
        ("BACKGROUND", (0, -1), (-1, -1), HexColor("#d1fae5")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(cost_table)
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "Your Store Update Monitor can run completely FREE forever. The free tiers are more than enough "
        "for a monitoring tool used by a small to medium team. You only pay if you want a custom domain "
        "(optional) or if you exceed the free limits (very unlikely for this type of app).",
        tip_style
    ))
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        '<b>Need help?</b> Contact Mr. Raymond M. Reintegrado at '
        '<b>raymond.reintegrado@hiflyer.ca</b>',
        ParagraphStyle("Footer", parent=body_style, alignment=TA_CENTER, fontSize=11, textColor=EMERALD)
    ))

    return story

def build_pdf():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="Store Update Monitor - Deployment Guide",
        author="Mr. Raymond M. Reintegrado",
        subject="Complete deployment guide for beginners",
    )
    story = build_story()
    doc.build(story)
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB")

if __name__ == "__main__":
    build_pdf()
