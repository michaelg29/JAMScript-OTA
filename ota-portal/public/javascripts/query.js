var submit = document.getElementById("submit");
var queryInput = document.getElementById("query")
var output = document.getElementById("output");
submit.onclick = function() {
    var query = queryInput.value;

    const request = new XMLHttpRequest();
    request.open("POST", "query");
    request.setRequestHeader('Content-Type', 'text/plain');
    console.log("text", query);
    request.send(query);

    request.onload = () => {
        const response = request.response;
        console.log(response);
        output.innerHTML = response;
    }
};
