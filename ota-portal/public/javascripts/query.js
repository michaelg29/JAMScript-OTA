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
