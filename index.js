// Create needed constants
const list = document.querySelector('ul');
const titleInput = document.querySelector('#title');
const bodyInput = document.querySelector('#body');
const form = document.querySelector('form');
const submitBtn = document.querySelector('form button');
const titleListInput = document.querySelector('#title-list');
const addListbtn = document.querySelector('#add-list');
const listContainer = document.querySelector('.note-display');

let db;

window.onload = function () {

    let request = window.indexedDB.open('notes_db', 1);

    request.onerror = function () {
        console.log('Database failed to open');
    };

    request.onsuccess = function () {
        console.log('Database opened succesfully');

        db = request.result;
        displayList();
    };

    request.onupgradeneeded = function (e) {
        let db = e.target.result;
        let objectStore = db.createObjectStore('notes_os', { keyPath: 'id' });
        console.log('Database setup complete');
    };

    addListbtn.addEventListener('click', addList);
    form.onsubmit = addData;

    // List functions performing Crud

    function addList(e) {
        e.preventDefault();

        let newItem = {
            id: uuidv4(),
            listTitle: titleListInput.value,
            createdDateTime: new Date(),
            cards: {}
        };

        let transaction = db.transaction(['notes_os'], 'readwrite');

        let objectStore = transaction.objectStore('notes_os');

        var request = objectStore.add(newItem);
        request.onsuccess = function () {
            titleListInput.value = '';
        };

        transaction.oncomplete = function () {
            console.log('Transaction completed: database modification finished.');

            displayList();
        };

        transaction.onerror = function () {
            console.log('Transaction not opened due to error');
        };
    }

    function displayList() {
        while (listContainer.firstChild) {
            listContainer.removeChild(listContainer.firstChild);
        }

        let objectStore = db.transaction('notes_os').objectStore('notes_os');
        objectStore.openCursor().onsuccess = function (e) {
            let cursor = e.target.result;
            if (cursor) {
                const { container, textEl, unorderedList } = createNewList();
                const nodeVal = cursor.value;
                textEl.textContent = nodeVal.listTitle;
                container.setAttribute('data-list-id', nodeVal.id);
                let evData;

                container.ondrop = (ev) => {
                    ev.preventDefault();
                    evData = ev.dataTransfer.getData("dragData");
                    const req = db.transaction('notes_os').objectStore('notes_os').get(nodeVal.id);
                    req.onsuccess = (e) => {
                        const destNode = e.target.result;
                        let data = evData;
                        data = JSON.parse(data);
                        listNodeToDel = document.querySelectorAll(`[data-note-id='${data.id}']`)[0].parentNode;
                        const dataToCopy = { ...data.nodeVal.cards[data.id] };

                        if (data.nodeVal.id !== destNode.id) {
                            deleteNode(ev, listNodeToDel, data.nodeVal, data.id, () => {
                                addData(ev, unorderedList, destNode, dataToCopy);
                            });
                        }
                    }
                }
                container.ondragover = function (ev) {
                    ev.preventDefault();
                }
                const deleteBtn = document.createElement('button');
                container.appendChild(deleteBtn);
                deleteBtn.textContent = 'X';
                deleteBtn.classList.add('delete-btn');

                deleteBtn.onclick = deleteList;

                const cardBtn = document.createElement('button');
                container.appendChild(cardBtn);
                cardBtn.textContent = 'Add Card';
                cardBtn.classList.add('add-btn');

                cardBtn.onclick = function () { return addData(event, unorderedList, nodeVal); };

                displayData(unorderedList, nodeVal.id);
                cursor.continue();
            }
        };
    }

    function createNewList() {
        const container = document.createElement('div');
        const textEl = document.createElement('h4');
        const unorderedList = document.createElement('ul');

        textEl.classList.add('list-header-text');
        container.classList.add('list-container');
        container.appendChild(textEl);
        container.appendChild(unorderedList);
        listContainer.appendChild(container);
        return { container, textEl, unorderedList };
    }

    function deleteList(e) {
        let noteId = e.target.parentNode.getAttribute('data-list-id');

        let transaction = db.transaction(['notes_os'], 'readwrite');
        let objectStore = transaction.objectStore('notes_os');
        let request = objectStore.delete(noteId);

        transaction.oncomplete = function () {
            e.target.parentNode.parentNode.removeChild(e.target.parentNode);
            console.log('Note ' + noteId + ' deleted.');

            if (!list.firstChild) {
                const listItem = document.createElement('li');
                listItem.textContent = 'No notes stored.';
                list.appendChild(listItem);
            }
        };
    }

    // Card/Node functions performing Crud

    function addData(e, curList, listData, nodeData) {
        e.preventDefault();

        if (nodeData && Object.keys(nodeData).length) {
            listData.cards[nodeData.id] = nodeData;
        } else {
            let cardId = uuidv4();
            let newItem = {
                id: cardId,
                title: titleInput.value,
                body: bodyInput.value,
                createdDateTime: new Date(),
            };
            listData.cards[cardId] = newItem;
        }
        let transaction = db.transaction(['notes_os'], 'readwrite');

        let objectStore = transaction.objectStore('notes_os');

        var request = objectStore.put(listData);
        request.onsuccess = function () {
            titleInput.value = '';
            bodyInput.value = '';
        };

        transaction.oncomplete = function () {
            console.log('Transaction completed: database modification finished.');

            displayData(curList, listData.id);
            // displayList();
        };

        transaction.onerror = function () {
            console.log('Transaction not opened due to error');
        };
    }

    function displayData(curList, curListId, callback) {
        while (curList.firstChild) {
            curList.removeChild(curList.firstChild);
        }

        let objectStore = db.transaction('notes_os').objectStore('notes_os');
        objectStore.openCursor().onsuccess = function (e) {
            let cursor = e.target.result;

            if (cursor) {
                if (cursor.value.id === curListId) {
                    let cardsData = cursor.value.cards;
                    const nodeVal = cursor.value;
                    // if (cardsData && cardsData.length) {
                    Object.keys(cardsData).forEach(ele => {
                        const listItem = document.createElement('li');
                        const h3 = document.createElement('h3');
                        const para = document.createElement('p');

                        listItem.classList.add('notes-card');
                        listItem.setAttribute('draggable', 'true');

                        listItem.appendChild(h3);
                        listItem.appendChild(para);
                        curList.appendChild(listItem);

                        h3.textContent = cardsData[ele].title;
                        para.textContent = cardsData[ele].body;

                        listItem.setAttribute('data-note-id', cardsData[ele].id);

                        listItem.ondragstart = function (ev) {
                            const data = { nodeVal, id: cardsData[ele].id };
                            ev.dataTransfer.setData("dragData", JSON.stringify(data));
                        }

                        const deleteBtn = document.createElement('button');
                        listItem.appendChild(deleteBtn);
                        deleteBtn.textContent = 'X';
                        deleteBtn.classList.add('delete-btn');
                        deleteBtn.onclick = function () {
                            return deleteNode(event, curList, nodeVal);
                        }

                    });
                    if (callback && (typeof (callback) === 'function')) {
                        callback();
                    }
                }
                cursor.continue();
            } else {
                if (!curList.firstChild) {
                    const listItem = document.createElement('li');
                    listItem.textContent = 'No notes stored.'
                    curList.appendChild(listItem);
                }
                console.log('Notes all displayed');
            }
        };
    }

    function deleteNode(e, curList, listData, id, callback) {
        e.preventDefault();
        let cardId = id ? id : e.target.parentNode.getAttribute('data-note-id');
        delete listData.cards[cardId];
        let transaction = db.transaction(['notes_os'], 'readwrite');

        let objectStore = transaction.objectStore('notes_os');
        var request = objectStore.put(listData);
        request.onsuccess = function () {
            titleInput.value = '';
            bodyInput.value = '';
        };
        transaction.oncomplete = function () {
            console.log('Transaction completed: database modification finished.');

            displayData(curList, listData.id, callback);
            // displayList();
        };
        transaction.onerror = function () {
            console.log('Transaction not opened due to error');
        };
    }

    // Utils
    // Gets unique id https://stackoverflow.com/a/2117523
    function uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        ).split('-').join('');
    }

    function fetchDropList(callback) {
        callback();
    }
};