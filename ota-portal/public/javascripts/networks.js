
async function createNetwork() {
    const name = document.querySelector("#create-network-name").value;

    var res = await dataRequest("POST", "networks", undefined, {
        "name": name
    });
    
    if (res.status >= 400) {
        document.querySelector("#create-network-error").innerHTML = "";
    }
    else {
        window.location.reload();
    }
}

async function deleteNetwork(networkId) {
    await dataRequest("DELETE", `networks/${networkId}`);
}
