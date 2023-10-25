async function pingNode(nodeId) {
    await dataRequest("NOTIFY", `nodes/${nodeId}`);
}

async function revokeNode(nodeId) {
    await dataRequest("PURGE", `nodes/${nodeId}`);
}

async function deleteNode(nodeId) {
    await dataRequest("DELETE", `nodes/${nodeId}`);
}

async function getChannel(networkId) {
    // get node IDs to upload to
    let nodeSelectElements = document.querySelectorAll("input.node-selector");
    let nodeIds = [];
    for (let el of nodeSelectElements) {
        if (!!el.checked) {
            nodeIds.push(el.id.substring("select-".length));
        }
    }

    // get channel ID to upload file
    let channelRes = await dataRequest("POST", `networks/${networkId}/channel`, undefined, {
        "nodeIds": nodeIds
    });
    console.log(channelRes);
}

async function uploadFile(networkId) {
    await getChannel(networkId);

    // upload file
    let file = document.querySelector("#file-input").files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        console.log("Sending file " + file.name);
        dataRequest("POST", `networks/${networkId}/channel/file`, undefined, e.target.result, "application/octet-stream")
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

async function uploadCommand(networkId) {
    await getChannel(networkId);

    // read command
    const cmd = document.querySelector("#cmd-input").value;

    // upload command
    let cmdRes = await dataRequest("POST", `networks/${networkId}/channel/cmd`, undefined, cmd, "text/plain");
    console.log(cmdRes);
}
