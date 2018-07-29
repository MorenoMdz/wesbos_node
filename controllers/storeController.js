const mongoose = require('mongoose');
const Store = mongoose.model('Store'); // loads the exported store into the variable Store
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');

    if (isPhoto) {
      next(null, true); // null for error means it worked and it is fine to continue to next()
    } else {
      next({ message: "That filetype ins't allowed!" }, false); // with error
    }
  },
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add a Store' }); // use the same store to add and edit
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); // skip if no file is uploaded
    return;
  }
  const extension = req.file.mimetype.split('/')[1]; // gets the extension
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to the fs, keep going
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await new Store(req.body).save(); // it wont move to the next line until the save returns something
  req.flash(
    'success',
    `Successfully Created ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = page * limit - limit;
  // query db for a list of all stores
  const storesPromise = Store.find()
    .skip(skip)
    .limit(limit);
  const countPromise = Store.count();
  // will await until both promises return
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit); // rounded
  if (!stores.length && skip) {
    req.flash(
      'info',
      `You asked for page ${page} that does not exists. Redirecting to the page ${pages}!`
    );
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render('stores', { title: 'stores', stores: stores, page, pages, count });
};

const confirmOwner = (store, user) => {
  // checks if the store author is the same as the user._id (logged in user currently)
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  // 1 find the store with the given id via params (:id)
  const store = await Store.findOne({ _id: req.params.id });
  // 2 confirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3 render out the edit form to the user
  res.render('editStore', { title: `Edit ${store.name} store`, store: store });
};

exports.updateStore = async (req, res) => {
  // set location data to be a point
  req.body.location.type = 'Point';
  //find and update the store
  const store = await Store.findOneAndUpdate(
    {
      _id: req.params.id,
    },
    req.body,
    {
      new: true, // return the new store instead of the old one, the updated data
      runValidators: true, // force the model to re run the schema validation
    }
  ).exec(); // to run the query
  req.flash(
    'success',
    `Successfully updated <strong>${store.name}</strong>.
  <a href="/stores/${store.slug}">View Store! </a>`
  );
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    'author reviews'
  );
  if (!store) return next(); // it kicks in the 404 error handler
  res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };

  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]); // destructuring

  res.render('tags', { title: 'Tags', tag, tags, stores });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    // first find stores that mach
    .find(
      {
        $text: {
          $search: req.query.q,
        },
      },
      {
        score: { $meta: 'textScore' },
      }
    )
    // then sort the results
    .sort({ score: { $meta: 'textScore' } })
    // then limit to 5 results
    .limit(5);

  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat); // parses to number from array
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates,
        },
        $maxDistance: 10000, // 10km
      },
    },
  };
  const stores = await Store.find(q)
    .select('slug name description location photo')
    .limit(10);
  /* .select(' -tags'); */
  res.json(stores);
};

exports.mapPage = async (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  // finds a likes a store hearts to toggle a heart

  const hearts = req.user.hearts.map(obj => obj.toString());
  // if param is exists remove from array, else add (unique) to array
  // const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  let operator;
  if (hearts.includes(req.params.id)) {
    operator = '$pull';
  } else {
    operator = '$addToSet';
  }
  const user = await User.findOneAndUpdate(
    req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    // returns where the _id is in the array user.hearts
    _id: { $in: req.user.hearts },
  });
  res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title: 'Top Stores!' });
};
