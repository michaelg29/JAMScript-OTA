async function pingNode(nodeId) {
    await dataRequest("NOTIFY", `nodes/${nodeId}`);
}

async function revokeNode(nodeId) {
    await dataRequest("PURGE", `nodes/${nodeId}`);
}

async function deleteNode(nodeId) {
    await dataRequest("DELETE", `nodes/${nodeId}`);
}

async function activateChannel(networkId, dataType, dataName) {
    // get node IDs to upload to
    let nodeSelectElements = document.querySelectorAll("input.node-selector");
    let nodeIds = [];
    for (let el of nodeSelectElements) {
        if (!!el.checked) {
            nodeIds.push(el.id.substring("select-".length));
        }
    }

    // download data to nodes
    let channelRes = await dataRequest("POST", `networks/${networkId}/channel`, undefined, {
        "nodeIds": nodeIds,
        "type": dataType,
        "name": dataName
    });
    console.log(channelRes);
}

async function uploadFile(networkId) {
    // upload file
    let file = document.querySelector("#file-input").files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        console.log("Sending file " + file.name);
        dataRequest("POST", `networks/${networkId}/channel/file?name=${file.name}`, undefined, e.target.result, "application/octet-stream")
            .then((data) => {
                console.log(data);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    // read file
    reader.readAsArrayBuffer(file);
}

async function downloadFile(networkId) {
    // read file name
    const fileName = document.querySelector("#file-select").value;

    // make download request
    await activateChannel(networkId, "file", fileName);
}

async function downloadCommand(networkId) {
    // read command
    const cmd = document.querySelector("#cmd-input").value;
    
    // upload command to server
    let cmdRes = await dataRequest("POST", `networks/${networkId}/channel/cmd`, undefined, cmd, "text/plain");
    console.log(cmdRes);

    // make download request
    await activateChannel(networkId, "cmd", "cmd");
}
