const bcrypt = require('bcryptjs');
let users = [
    {
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10), 
        desc: 'Super User & System Administrator'
    },
    {
        id: 2,
        username: 'Manajer Gudang',
        password: bcrypt.hashSync('password', 10), 
        role: 'Manajer',
        desc: 'Data gudang (READ, UPDATE). Data Inventori di gudang yang ditugaskan (CRUD). Data pengiriman terkait gudang (READ).'
    },
    {
        id: 3,
        username: 'Staff Gudang',
        password: bcrypt.hashSync('password', 10),
        role: 'Staff',
        desc: 'data gudang terkait (READ). Stok inventori (READ, UPDATE), Data pengiriman terkait gudang (READ).'
    },
    {
        id: 4,
        username: 'Operasional',
        password: bcrypt.hashSync('password', 10), 
        role: 'ops',
        desc: 'Membaca dan memperbarui data pengiriman (READ, UPDATE). Membaca data inventori terkait pengiriman (READ).'
    },
    {
        id: 5,
        username: 'Customer',
        password: bcrypt.hashSync('password', 10), 
        role: 'Cust',
    },
];
module.exports = {
    findByUsername: (username) => users.find(user => 
        user.username === username),
    findById: (id) => users.find(user => user.id === id),
};