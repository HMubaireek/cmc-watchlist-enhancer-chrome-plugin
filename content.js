
const cmc_table_class = ".cmc-table";
const cmc_coin_symbol_query = "a.cmc-link .coin-item-symbol";

window.addEventListener("load", () => {
    const checkExist = setInterval(() => {
        const tableBody = document.querySelector(cmc_table_class);
        if (tableBody) {
            clearInterval(checkExist);
            addColumns(tableBody);
        }
    }, 100); // Check every 100ms

});

function addColumns(tableBody) {
    addNoteColumn(tableBody);
}

function addNoteColumn(tableBody) {
    const tableHeader = tableBody.querySelector("thead tr");
    const tableRows = tableBody.querySelector("tbody tr");
    const headerCells = Array.from(tableHeader.children);
    let notesColumnIndex = -1;

    // Find the index of the "Notes" column header
    for (let i = 0; i < headerCells.length; i++) {
        const headerCell = headerCells[i];
        if (headerCell.textContent.trim() === "Notes") {
            notesColumnIndex = i;
            break;
        }
    }

    // If "Notes" column not found, add it as the last column
    if (notesColumnIndex === -1) {
        const notesHeaderCell = document.createElement("th");
        notesHeaderCell.textContent = "Notes";
        tableHeader.appendChild(notesHeaderCell);

        notesColumnIndex = headerCells.length;
        tableRows.forEach((row) => {
            const noteColumn = document.createElement("td");
            noteColumn.classList.add("cmc-table__cell");
            row.appendChild(noteColumn);
        });
    }

    tableRows.forEach((row) => {
        const symbol = row.querySelector(cmc_coin_symbol_query)?.innerText;
        const note = getNoteFromLocalStorage(symbol);

        const noteColumn = row.children[notesColumnIndex];
        noteColumn.textContent = note;
    });
}



function getNoteFromLocalStorage(symbol) {
    const storedNotes = JSON.parse(localStorage.getItem("cmcNotes")) || {};
    return storedNotes[symbol] || "";
}