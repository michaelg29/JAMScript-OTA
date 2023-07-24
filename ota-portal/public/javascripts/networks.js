
async function createNetwork() {
    const netId = document.querySelector("#create-network-id").value;
    const name = document.querySelector("#create-network-name").value;

    var res = await dataRequest("POST", "networks", undefined, {
        "id": netId,
        "name": name
    });
    
    if (res.status >= 400) {
        document.querySelector("#create-network-error").innerHTML = "";
    }
    else {
        window.location.reload();
    }
}

async function clearPassphrases(networkId) {
    await dataRequest("DELETE", `networks/${networkId}/passphrases`);
}

async function deleteNetwork(networkId) {
    await dataRequest("DELETE", `networks/${networkId}`);
}
