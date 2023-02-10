var submit = document.getElementById("submit");
var queryInput = document.getElementById("query")
var output = document.getElementById("output");
submit.onclick = async function() {
    var query = queryInput.value;

    let res = await dataRequest("POST", "query", {
        "Content-Type": "text/plain"
    }, query, "text");

    output.innerHTML = res.data;
};

var reqSubmit = document.getElementById("routeRequest");
reqSubmit.onclick = async function() {
    let node = {
        type: "device"
    }

    let res = await dataRequest("POST", "node", undefined, node);

    console.log(res.data, res.status, res.headers);
}
