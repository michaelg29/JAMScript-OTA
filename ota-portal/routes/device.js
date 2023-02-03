var express = require('express');
var router = express.Router();

router.post("/reserve", function(req, res, next) {
    console.log(typeof req.body, req.body);

    res.send();
});

module.exports = router;
