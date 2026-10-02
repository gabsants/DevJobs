const{ Router} = require ('express');
const router = Router();

const vagasMock = [
    {id: 1, titulo:'Dev FrontEnd React', empresa:'TechLabs', tipo:'Remoto'}
];

router.get('/', (req, res) => {
    res.json(vagasMock);
});

module.exports = router;