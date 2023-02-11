
const types = {
    DEVICE: "device",
    FOG: "fog",
    CLOUD: "cloud"
};

const statuses = {
    CREATED: "created",
    REGISTERED: "registered",
    EXPIRED: "expired",
    REVOKED: "revoked"
};

module.exports = {
    nodeKey: (uuid) => "node:" + uuid,
    types: types,
    typesList: Object.values(types).join(", "),
    validType: (type) => Object.values(types).includes(type),
    statuses: statuses,
};