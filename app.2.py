

from textual.app import App, ComposeResult
from textual.containers import HorizontalGroup, Grid
from textual.screen import ModalScreen
from textual.widgets import Footer, Header, OptionList, Label
from textual.containers import HorizontalGroup, VerticalScroll
from textual.widgets import Button, Digits, Footer, Header
from textual.widgets._option_list import Option


class FileSelectorDialog(ModalScreen):

    def compose(self) -> ComposeResult:
        yield Grid(
            Label("Select a file:"),
            OptionList(
                Option("Aerilon", id="aer"),
                Option("Aquaria", id="aqu"),
                None,
                Option("Canceron", id="can"),
                Option("Caprica", id="cap", disabled=True),
                None,
                Option("Gemenon", id="gem"),
                None,
                Option("Leonis", id="leo"),
                Option("Libran", id="lib"),
                None,
                Option("Picon", id="pic"),
                None,
                Option("Sagittaron", id="sag"),
                Option("Scorpia", id="sco"),
                None,
                Option("Tauron", id="tau"),
                None,
                Option("Virgon", id="vir"),
            )
,

            Grid(
                Button("Open", id="open"),
                Button("Cancel", id="cancel"),
                id = "dialog-buttons"
            ),
            id = "dialog"
        )


class StopwatchApp(App):
    """A Textual app to manage stopwatches."""

    CSS_PATH = "app.css"
    BINDINGS = [("d", "toggle_dark", "Toggle dark mode")]




    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""


        yield Header()
        yield Footer()


    def action_toggle_dark(self) -> None:
        """An action to toggle dark mode."""
        self.push_screen(FileSelectorDialog())


if __name__ == "__main__":
    app = StopwatchApp()
    app.run()
