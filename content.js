const cmc_table_class = ".cmc-table";
const cmc_coin_symbol_query = "a.cmc-link .coin-item-symbol";
const columns_to_add = [
    { id: 'tp', name: "Target Price", type: "text" },
    { id: 'buy', name: "Buy?", type: "dropdown", options: ["Yes", "No"] },
];

let column_data = {};

window.addEventListener("load", () => {
    const checkExist = setInterval(() => {
        const tableBody = document.querySelector(cmc_table_class);
        if (tableBody) {
            clearInterval(checkExist);

            //fetch the column values from storage
            fetchColumnValues((columnValues) => {
                console.log("Retrieved column values:", columnValues);
                //add columns to the table
                addColumns(tableBody);
            });


            //detect changes in the table body  
            listenToScroll();
        }
    }, 100); // Check every 100ms
});

function listenToScroll() {
    const debouncedCheckForRowUpdates = debounce(checkForRowUpdates, 500); // Adjust the debounce delay as needed
    window.addEventListener("scroll", debouncedCheckForRowUpdates);
}

// Debounce function to limit the frequency of function calls
function debounce(func, delay) {
    let timerId;
    return function (...args) {
        if (timerId) {
            clearTimeout(timerId);
        }
        timerId = setTimeout(() => {
            func(...args);
            timerId = null;
        }, delay);
    };
}

function checkForRowUpdates() {
    const tableRows = document.querySelectorAll("tbody tr");

    tableRows.forEach((row) => {
        const isRowFilled = isRowFilledWithData(row);

        if (isRowFilled) {
            const columnIndex = columns_to_add.length + 1;
            const columnConfig = columns_to_add[columnIndex - 1];
            const value = getColumnValue(row, columnConfig);
            const columnElement = row.children[columnIndex];

            if (columnElement) {
                columnElement.textContent = value;
                checkForBuyColumn(columnConfig.name, value, columnElement);
            }
        }
    });
}

function isRowFilledWithData(row) {
    // Check if the row is filled with data based on the structure and content of the row elements
    // Modify this function according to the structure of your rows

    const emptyRowIdentifier = "span"; // Element tag that indicates an empty row

    const emptyElements = row.querySelectorAll(emptyRowIdentifier);

    return emptyElements.length === 0;
}

function addColumns(tableBody) {
    columns_to_add.forEach((columnConfig) => {
        addColumn(tableBody, columnConfig);
    });
}

function addColumn(tableBody, columnConfig) {
    const { id, name, type, options } = columnConfig;

    const tableHeader = tableBody.querySelector("thead tr");
    const tableRows = tableBody.querySelectorAll("tbody tr");
    const headerCells = Array.from(tableHeader.children);
    let columnIndex = -1;

    // Find the index of the "name" column header
    for (let i = 0; i < headerCells.length; i++) {
        const headerCell = headerCells[i];
        if (headerCell.textContent.trim() === name) {
            columnIndex = i;
            break;
        }
    }

    // If "name" column not found, add it as the last column
    if (columnIndex === -1) {
        const columnHeaderCell = document.createElement("th");
        columnHeaderCell.style.textAlign = "end";
        columnHeaderCell.classList.add("stickyTop");

        const columnHeaderDiv = document.createElement("div");
        columnHeaderDiv.classList.add("sc-id", "id-val");
        columnHeaderDiv.textContent = name;
        columnHeaderCell.appendChild(columnHeaderDiv);

        tableHeader.appendChild(columnHeaderCell);

        columnIndex = headerCells.length;

        addColumnRowCells(tableRows, columnConfig);
    }

    // Add the column to each row
    addValuesToColumnRows(tableRows, columnIndex, columnConfig);
}

function addColumnRowCells(tableRows, columnConfig) {
    tableRows.forEach((row) => {
        const column = document.createElement("td");
        column.style.textAlign = "end";
        column.classList.add("cmc-table__cell");
        row.appendChild(column);
        listenToColumnDoubleClicks(column, columnConfig);
    });
}

function addValuesToColumnRows(tableRows, columnIndex, columnConfig) {
    tableRows.forEach((row) => {
        const value = getColumnValue(row, columnConfig);
        const columnElement = row.children[columnIndex];
        if (columnElement) {
            columnElement.textContent = value;
            onColumnValueChange(columnElement, value, columnConfig, false);
        }
    });
}

function parseNumber(value) {
    return Number(value?.replace(/,/g, ''));
}

function checkForBuyColumn(columnName, value, columnElement) {
    const columnConfig = columns_to_add.find((column) => column.name === columnName);
    const buyColumn = columnConfig && columnConfig.id === "buy";
    if (buyColumn) {
        const row = columnElement.parentElement;
        const targetColumnConfig = columns_to_add.find((column) => column.id === "tp");
        const targetPrice = parseNumber(getColumnValue(row, targetColumnConfig));
        const currentPrice = parseNumber(getPriceValue(columnElement)?.split("$")?.[1]);
        const priceDifference = currentPrice - targetPrice;
        const percentageDifference = (priceDifference / targetPrice) * 100;
      
        if (currentPrice <= targetPrice || percentageDifference <= 10) {
            columnElement.textContent = "Yes";
            columnElement.classList.add("buy-signal");
        } else {
            columnElement.textContent = "No";
            columnElement.classList.remove("buy-signal");
        }
    }
}

function listenToColumnDoubleClicks(column, columnConfig) {
    column.addEventListener("dblclick", () => {
        createEditableInput(column, columnConfig);
    });
}

function getRowSymbol(row) {
    return row.querySelector(cmc_coin_symbol_query)?.innerText;
}

function getPriceValue(tdElement) {
    const tbody = tdElement.parentElement.parentElement; // Get the tbody element
    const thElements = tbody.parentElement.querySelector("thead tr").children; // Get the th elements from the table header row
    let priceColumnIndex = -1;

    // Find the index of the "Price" column
    for (let i = 0; i < thElements.length; i++) {
        if (thElements[i].textContent.trim().toLowerCase() === "price") {
            priceColumnIndex = i;
            break;
        }
    }

    if (priceColumnIndex !== -1) {
        const siblingTd = tdElement.parentElement.children[priceColumnIndex]; // Get the sibling td element in the same column
        return siblingTd.textContent.trim();
    } else {
        console.log("Price column not found.");
        return null;
    }
}


function checkForNullsInDataObj(watchListName, symbol, columnId) {
    if (!column_data[watchListName]) {
        column_data[watchListName] = {};
    }
    if (!column_data[watchListName][symbol]) {
        column_data[watchListName][symbol] = {};
    }
    if (!column_data[watchListName][symbol][columnId]) {
        column_data[watchListName][symbol][columnId] = {};
    }
}

function getColumnValue(row, columnConfig) {
    const symbol = getRowSymbol(row);
    const columnId = columnConfig.id;
    const watchListName = getWatchListName();
    const columnValue = column_data?.[watchListName]?.[symbol]?.[columnId];
    return columnValue || "N/A";
}

function saveColumnValue(row, columnConfig, value) {
    const symbol = getRowSymbol(row);
    const columnId = columnConfig.id;
    const watchListName = getWatchListName();
    checkForNullsInDataObj(watchListName, symbol, columnId);
    column_data[watchListName][symbol][columnId] = value;
}

function createEditableInput(columnElement, columnConfig) {
    const { name, type, options } = columnConfig;
    const value = columnElement.textContent;

    if (type === "dropdown") {
        const selectElement = document.createElement("select");
        selectElement.classList.add("editable-input");

        options.forEach((option) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.text = option; // Use 'text' instead of 'textContent'
            selectElement.appendChild(optionElement);
        });

        selectElement.value = value;

        columnElement.innerHTML = "";
        columnElement.appendChild(selectElement);
    } else {
        const inputElement = document.createElement("input");
        inputElement.type = "text";
        inputElement.value = value;
        inputElement.classList.add("editable-input");

        columnElement.innerHTML = "";
        columnElement.appendChild(inputElement);
    }

    const inputElement = columnElement.querySelector("input, select");
    inputElement.value = value; // Use 'value' instead of 'textContent'
    inputElement.focus();

    inputElement.addEventListener("blur", () => {
        const newValue = inputElement.value;
        columnElement.textContent = newValue;
        onColumnValueChange(columnElement, newValue, columnConfig);
    });
}

function onColumnValueChange(element, newValue, columnConfig, persist = true) {
    const columnName = columnConfig.name;

    if (persist) {
        // Save the updated value
        saveColumnValue(element.parentElement, columnConfig, newValue);
        //persist the updated value
        persistColumnValues();

    }
    //perform operations on new values
    checkForBuyColumn(columnName, newValue, element);
}

function updateColumnValues(addedRows, removedRows) {
    addedRows.forEach((row) => {
        const columnNameElements = row.querySelectorAll(`td > [color="text"]`);
        if (columnNameElements.length === columns_to_add.length) {
            const columns = row.querySelectorAll("td");
            columns.forEach((columnElement, columnIndex) => {
                const columnName = columns_to_add[columnIndex].name;
                const columnConfig = columns_to_add.find((column) => column.name === columnName);
                const value = getColumnValue(row, columnConfig);
                columnElement.textContent = value;
                onColumnValueChange(columnElement, value, columnConfig);
            });
        }
    });

    removedRows.forEach((row) => {
        // Perform any cleanup or additional actions for removed rows if needed
    });
}

function getWatchListName() {
    return document.querySelector('h1 .datboK')?.textContent?.replace(/ /g, "_");
}

function getStorageKey() {
    const storageKey = getWatchListName() + "_columnValues";
    return storageKey;
}

function persistColumnValues() {
    const storageKey = getStorageKey();
    chrome.storage.sync.set({ [storageKey]: column_data }, () => {
        console.log("Column values saved", column_data);
    });
}

function fetchColumnValues(callback) {
    const storageKey = getStorageKey();

    chrome.storage.sync.get(storageKey, (result) => {
        const columnValues = result || {};
        column_data = columnValues[storageKey] || {};
        callback(columnValues);
    });
}


