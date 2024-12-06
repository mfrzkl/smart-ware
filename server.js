const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const fs = require('fs-extra');
const app = express();
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const { port } = require('./config');
app.use(bodyParser.json()); // Parsing JSON dari body request
const rateLimit = require('express-rate-limit');
const path = require('path');

// Konfigurasi Rate Limiting untuk semua rute API
const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // Jendela waktu 1 jam
    max: 10, // Maksimal 10 permintaan per IP dalam 1 jam
    message: 'Terlalu banyak permintaan, coba lagi setelah 1 jam', // Pesan jika limit terlampaui
    standardHeaders: true, // Menambahkan header RateLimit-* ke response
    legacyHeaders: false, // Menonaktifkan X-RateLimit-* header
});


// Menggunakan routing
app.use('/api/auth', authRoutes);

// Terapkan rate limit pada endpoint
app.use('/inventory', apiLimiter)

app.use(bodyParser.json());

app.get('/warehouses', (req, res) => {
    const filePath = path.join(__dirname, './warehouses.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data warehouse' });
        }

        const jsonData = JSON.parse(data);
        const warehouses = jsonData.warehouses;
        res.json(warehouses);
    });
});

app.get('/warehouses/:id', (req, res) => {
    const filePath = path.join(__dirname, './warehouses.json');
    const warehouseId = parseInt(req.params.id, 10);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data warehouse' });
        }

        const jsonData = JSON.parse(data);
        const warehouse = jsonData.warehouses.find(w => w.id === warehouseId);

        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse tidak ditemukan' });
        }

        res.json(warehouse);
    });
});

app.post('/warehouses', (req, res) => {
    const filePath = path.join(__dirname, './warehouses.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data warehouse' });
        }

        let jsonData = JSON.parse(data);
        let warehouses = jsonData.warehouses || [];

        const newWarehouse = {
            id: warehouses.length + 1,
            nama: req.body.nama,
            lokasi: req.body.lokasi,
            kapasitas: req.body.kapasitas,
            kapasitas_digunakan: req.body.kapasitas_digunakan,
            keterangan: req.body.keterangan
        };

        warehouses.push(newWarehouse);

        fs.writeFile(filePath, JSON.stringify({ warehouses: warehouses }, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error menyimpan warehouse baru' });
            }
            res.status(201).json(newWarehouse);
        });
    });
});

app.put('/warehouses/:id', (req, res) => {
    const filePath = path.join(__dirname, './warehouses.json');
    const warehouseId = parseInt(req.params.id, 10);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data warehouse' });
        }

        let jsonData = JSON.parse(data);
        let warehouseIndex = jsonData.warehouses.findIndex(w => w.id === warehouseId);

        if (warehouseIndex === -1) {
            return res.status(404).json({ message: 'Warehouse tidak ditemukan' });
        }

        jsonData.warehouses[warehouseIndex] = {
            ...jsonData.warehouses[warehouseIndex],
            ...req.body,
        };

        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error menyimpan perubahan warehouse' });
            }
            res.json(jsonData.warehouses[warehouseIndex]);
        });
    });
});

app.delete('/warehouses/:id', (req, res) => {
    const filePath = path.join(__dirname, './warehouses.json');
    const warehouseId = parseInt(req.params.id, 10);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data warehouse' });
        }

        let jsonData = JSON.parse(data);
        const warehouseIndex = jsonData.warehouses.findIndex(w => w.id === warehouseId);

        if (warehouseIndex === -1) {
            return res.status(404).json({ message: 'Warehouse tidak ditemukan' });
        }

        jsonData.warehouses.splice(warehouseIndex, 1);

        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error menghapus warehouse' });
            }
            res.json({ message: 'Warehouse berhasil dihapus' });
        });
    });
});


app.get('/inventory', (req, res) => {
    const filePath = path.join(__dirname, './inventory.json');
    
    // Baca file JSONnya
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error baca data product' });
        }
        
        const jsonData = JSON.parse(data);
        const inventory = jsonData.inventory;
        res.json(inventory);
    });
});

app.get('/inventory/:id', (req, res) => {
    const filePath = path.join(__dirname, './inventory.json');
    const productId = parseInt(req.params.id, 10);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data, hubungi pengembang' });
        }

        const jsonData = JSON.parse(data);
        const inventory = jsonData.products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        res.json(product);
    });
});

// Fungsi untuk generate barcode secara acak
function generateRandomBarcode(length = 12) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let barcode = '';
    for (let i = 0; i < length; i++) {
        barcode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return barcode;
}

app.post('/inventory', (req, res) => {
    const filePath = path.join(__dirname, './inventory.json');
    
    // Membaca file JSON
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data inventori' });
        }

        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (parseErr) {
            return res.status(500).json({ message: 'Error parsing data inventori' });
        }

        let inventory = jsonData.inventory;

        // Validasi struktur data inventori
        if (!Array.isArray(inventory)) {
            return res.status(500).json({ message: 'Data inventori tidak valid, hubungi pengembang' });
        }

        // Validasi input request body
        const { 
            nama, harga, satuan, jumlah_stok, berat, dimensi, kategori, 
            status, tanggal_masuk, tanggal_kadaluarsa, warehouse_id, lokasi_dalam_gudang 
        } = req.body;

        // Memastikan semua kolom wajib diisi
        if (!nama || !harga || !satuan || !jumlah_stok || !berat || !dimensi || !kategori || !status || !tanggal_masuk || !warehouse_id || !lokasi_dalam_gudang) {
            return res.status(400).json({ 
                message: 'Semua kolom wajib diisi: nama, harga, satuan, jumlah_stok, berat, dimensi, kategori, status, tanggal_masuk, warehouse_id, lokasi_dalam_gudang' 
            });
        }

        // Validasi harga, jumlah_stok, dan berat harus berupa angka
        if (isNaN(harga) || isNaN(jumlah_stok) || isNaN(berat)) {
            return res.status(400).json({
                message: 'Harga, jumlah_stok, dan berat harus berupa angka.'
            });
        }

        // Validasi tanggal_masuk harus berupa format tanggal yang valid
        const isValidDate = Date.parse(tanggal_masuk);
        if (isNaN(isValidDate)) {
            return res.status(400).json({
                message: 'Tanggal masuk harus berupa format tanggal yang valid.'
            });
        }

        // Membuat objek baru untuk inventori
        const newInventory = {
            id: inventory.length + 1, // Penomoran otomatis
            nama,
            harga,
            satuan,
            jumlah_stok,
            berat,
            dimensi,
            kategori,
            status,
            tanggal_masuk,
            tanggal_kadaluarsa: tanggal_kadaluarsa || null, // Jika tidak ada, set null
            barcode: generateRandomBarcode(), // Generate barcode otomatis
            warehouse_id,
            lokasi_dalam_gudang
        };

        // Menambahkan inventori baru ke array
        inventory.push(newInventory);

        // Menulis ulang data inventori ke file JSON
        fs.writeFile(filePath, JSON.stringify({ inventory: inventory }, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ 
                    message: 'Gagal menambahkan data inventori, hubungi pengembang.' 
                });
            }
            res.status(201).json(newInventory);
        });
    });
});


app.get('/shipments', (req, res) => {
    const filePath = path.join(__dirname, './shipments.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data pengiriman' });
        }
        const shipments = JSON.parse(data).shipments;
        res.json(shipments);
    });
});

app.post('/shipments', (req, res) => {
    // Validasi input request body
    const { nama_pengirim, nama_penerima, alamat_pengirim, alamat_penerima, tanggal_pengiriman, tanggal_estimasi_sampai, status, gudang_pengirim_id, gudang_penerima_id, produk } = req.body;

    if (!nama_pengirim || !nama_penerima || !alamat_pengirim || !alamat_penerima || !tanggal_pengiriman || !tanggal_estimasi_sampai || !status || !gudang_pengirim_id || !gudang_penerima_id || !produk) {
        return res.status(400).json({
            message: 'Semua kolom harus diisi.'
        });
    }

    // Validasi apakah produk berupa array dan tidak kosong
    if (!Array.isArray(produk) || produk.length === 0) {
        return res.status(400).json({ message: 'Produk harus berupa array dan tidak kosong.' });
    }

    // Membaca data pengiriman dari file JSON
    const filePath = path.join(__dirname, './shipments.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data pengiriman.' });
        }

        let jsonData = JSON.parse(data);
        let shipments = jsonData.shipments || [];

        // Membuat objek pengiriman baru
        const newShipment = {
            id: shipments.length + 1, // Penomoran otomatis
            nama_pengirim,
            nama_penerima,
            alamat_pengirim,
            alamat_penerima,
            tanggal_pengiriman,
            tanggal_estimasi_sampai,
            status,
            gudang_pengirim_id,
            gudang_penerima_id,
            produk
        };

        // Menambahkan pengiriman baru ke dalam data pengiriman
        shipments.push(newShipment);

        // Menyimpan data pengiriman yang sudah diperbarui ke file JSON
        fs.writeFile(filePath, JSON.stringify({ shipments: shipments }, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Gagal menyimpan data pengiriman baru.' });
            }

            // Mengirim respons dengan data pengiriman yang baru ditambahkan
            res.status(201).json(newShipment);
        });
    });
});


app.put('/shipments/:id', (req, res) => {
    const filePath = path.join(__dirname, './shipments.json');
    const shipmentId = parseInt(req.params.id, 10);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data pengiriman' });
        }

        let shipments = JSON.parse(data).shipments;
        let shipmentIndex = shipments.findIndex(s => s.id === shipmentId);

        if (shipmentIndex === -1) {
            return res.status(404).json({ message: 'Pengiriman tidak ditemukan' });
        }

        shipments[shipmentIndex] = {
            ...shipments[shipmentIndex],
            ...req.body,
        };

        fs.writeFile(filePath, JSON.stringify({ shipments }, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error menyimpan perubahan pengiriman' });
            }
            res.json(shipments[shipmentIndex]);
        });
    });
});

app.delete('/shipments/:id', (req, res) => {
    const filePath = path.join(__dirname, './shipments.json');
    const shipmentId = parseInt(req.params.id, 10);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error membaca data pengiriman' });
        }

        let shipments = JSON.parse(data).shipments;
        const shipmentIndex = shipments.findIndex(s => s.id === shipmentId);

        if (shipmentIndex === -1) {
            return res.status(404).json({ message: 'Pengiriman tidak ditemukan' });
        }

        shipments.splice(shipmentIndex, 1);

        fs.writeFile(filePath, JSON.stringify({ shipments }, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error menghapus pengiriman' });
            }
            res.json({ message: 'Pengiriman berhasil dihapus' });
        });
    });
});


// Konfigurasi session untuk menyimpan data login
app.use(session({
    secret: 'session-secret??????', //belum dikonfigurasi
    resave: false,
    saveUninitialized: true
}));

// Inisialisasi passport dan session
app.use(passport.initialize());
app.use(passport.session());

// Konfigurasi Passport Google OAuth
passport.use(new GoogleStrategy({
    clientID: '11777270095-rrq7lhemof6v7daraumjc25ur5p9re4c.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/auth/callback'
},
    (accessToken, refreshToken, profile, done) => {
        console.log('Google Profile:', profile);
        return done(null, profile);
    }
));


// Serialize user ke session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user dari session
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Route untuk login menggunakan Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback route setelah login berhasil dengan Google
app.get('/auth/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    async (req, res) => {
        // Menangani data pengguna
        const userData = {
            displayName: req.user.displayName,
            email: req.user.emails.value ? req.user.emails.value[0].value : 'No public email',
            id: req.user.id,
            photo: req.user.photos ? req.user.photos[0].value : null
        };

        // Simpan data pengguna ke db.json
        try {
            const data = await fs.readJson('db.json').catch(() => ({ users: [] }));
            data.users.push(userData);
            await fs.writeJson('db.json', data);
            res.redirect('/profile');
        } catch (error) {
            console.error("Error writing to db.json:", error);
            res.redirect('/profile');
        }
    }
);

// Route untuk halaman utama
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Login</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 20px;
                        text-align: center;
                    }
                    h1 {
                        color: #333;
                    }
                    .login-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        // background: white;
                        padding: 20px;
                        // border-radius: 8px;
                        // box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        display: inline-block;
                    }
                    .login-member {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        display: inline-block;
                    }
                    .login-button {
                        background-color: transparent;
                        border: 2px solid transparent;
                        color: #333;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 10px;
                        display: flex;
                        align-items: center;
                        transition: all 0.3s;
                    }
                    .login-button:hover {
                        border: 2px solid #007bff;
                        color: #007bff;
                    }
                    .login-button img {
                        width: 30px;
                        height: 30px;
                        margin-right: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="login-container">
                    <h1>Boding Shop</h1>
                    <h1>Decorative Mirror, Glass & Aluminium Installer</h1>
                    <p>Login</p>
                    <button class="login-button" onclick="window.location.href='/auth/google'">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo">
                        Login dengan Google
                    </button>
                </div>
                </div>
            </body>
        </html>
    `);
});


// Route untuk menampilkan profil pengguna setelah login
app.get('/inventory', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.send(`
        //buatkan tampilan untuk membaca data dari endpoint inventory
    `);
});

// Route untuk logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.redirect('/profile'); // Jika ada error, redirect kembali ke profil
        }
        res.clearCookie('connect.sid'); // Hapus cookie sesi
        res.send(`
            <html>
                <head>
                    <title>Logged Out</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 20px;
                            text-align: center;
                        }
                        h1 {
                            color: #333;
                        }
                        button {
                            background-color: #007bff;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: background-color 0.3s;
                        }
                        button:hover {
                            background-color: #0056b3;
                        }
                    </style>
                </head>
                <body>
                    <h1>You have been logged out.</h1>
                    <button onclick="window.location.href='/'">Login Again</button>
                </body>
            </html>
        `);
    });
});

app.get("/login", (req, res) => {
    res.send(`<html>
        <head>
            <title>Login</title>
        </head>
        <body>
            <h1>Login</h1>
            <form method="POST" action="/api/auth/login">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required><br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required><br>
                <button type="submit">Login</button>
            </form>
        </body>
        </html>
    `)
})

app.get('/register', (req, res) => {
    res.send(`<html>
            <title>Register</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 20px;
                    text-align: center;
                }
            </style>
            <body>
                <h1>Daftarkan Akun</h1>
            </body>
        </html>`)
})

// Jalankan server
app.listen(3000, () => {
    console.log('Server berjalan di http://localhost:3000');
});
