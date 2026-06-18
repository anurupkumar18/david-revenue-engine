import os
import sqlite3
import webbrowser
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

console = Console()
DEFAULT_DB = Path(os.environ.get("ICP_STUDIO_DATA_DIR", Path.home() / ".icp-studio")) / "data.db"


def get_connection(db_path: Path):
    if not db_path.exists():
        raise click.ClickException(f"Database not found: {db_path}. Run ICP Studio first.")
    return sqlite3.connect(str(db_path))


@click.group()
@click.option("--db", default=str(DEFAULT_DB), help="Path to ICP Studio SQLite database")
@click.pass_context
def main(ctx, db):
    ctx.ensure_object(dict)
    ctx.obj["db"] = Path(db)


@main.command()
@click.option("--profile-id", type=int, required=True)
@click.pass_context
def status(ctx, profile_id):
    """Show outreach queue status for a profile."""
    conn = get_connection(ctx.obj["db"])
    rows = conn.execute(
        "SELECT status, COUNT(*) FROM outreach_queue WHERE profile_id = ? GROUP BY status",
        (profile_id,),
    ).fetchall()
    total = conn.execute(
        "SELECT COUNT(*) FROM outreach_queue WHERE profile_id = ?", (profile_id,)
    ).fetchone()[0]
    console.print(f"\n[bold]Outreach queue for profile {profile_id}[/bold] — {total} total\n")
    for status_val, count in rows:
        console.print(f"  {status_val}: {count}")
    conn.close()


@main.command()
@click.option("--profile-id", type=int, required=True)
@click.pass_context
def next(ctx, profile_id):
    """Open next pending contact in browser and show connection note."""
    conn = get_connection(ctx.obj["db"])
    row = conn.execute(
        """SELECT id, name, company, title, email, phone, linkedin_search_url, connection_note
           FROM outreach_queue WHERE profile_id = ? AND status = 'pending' ORDER BY id LIMIT 1""",
        (profile_id,),
    ).fetchone()

    if not row:
        console.print("[yellow]No pending contacts in queue.[/yellow]")
        conn.close()
        return

    item_id, name, company, title, email, phone, linkedin_url, note = row

    console.print(f"\n[bold cyan]{name}[/bold cyan] — {title} at {company}")
    if email:
        console.print(f"Email: {email}")
    if phone:
        console.print(f"Phone: {phone}")
    console.print(f"\n[bold]Connection note ({len(note)} chars):[/bold]")
    console.print(f"[green]{note}[/green]\n")

    if linkedin_url:
        console.print(f"Opening: {linkedin_url}")
        webbrowser.open(linkedin_url)

    conn.execute(
        "UPDATE outreach_queue SET status = 'opened' WHERE id = ?", (item_id,)
    )
    conn.commit()
    console.print(f"\nItem #{item_id} marked as [bold]opened[/bold].")
    console.print("After connecting, run: [cyan]linkedin-outreach mark --id {id} --status connected[/cyan]".format(id=item_id))
    conn.close()


@main.command()
@click.option("--id", "item_id", type=int, required=True)
@click.option("--status", type=click.Choice(["connected", "skipped", "not_found"]), required=True)
@click.option("--notes", default="")
@click.pass_context
def mark(ctx, item_id, status, notes):
    """Mark outreach item as connected, skipped, or not found."""
    conn = get_connection(ctx.obj["db"])
    conn.execute(
        "UPDATE outreach_queue SET status = ?, notes = ? WHERE id = ?",
        (status, notes, item_id),
    )
    conn.commit()
    console.print(f"Item #{item_id} marked as [bold]{status}[/bold]")
    conn.close()


@main.command("list")
@click.option("--profile-id", type=int, required=True)
@click.pass_context
def list_queue(ctx, profile_id):
    """List all outreach queue items."""
    conn = get_connection(ctx.obj["db"])
    rows = conn.execute(
        """SELECT id, name, company, status, connection_note FROM outreach_queue
           WHERE profile_id = ? ORDER BY id""",
        (profile_id,),
    ).fetchall()
    table = Table(title=f"Outreach Queue (profile {profile_id})")
    table.add_column("ID", style="dim")
    table.add_column("Name")
    table.add_column("Company")
    table.add_column("Status")
    for r in rows:
        table.add_row(str(r[0]), r[1] or "", r[2] or "", r[3])
    console.print(table)
    conn.close()


if __name__ == "__main__":
    main()
