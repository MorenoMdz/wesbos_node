const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!',
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: [
      {
        type: Number,
        required: 'You must supply the coordinates!',
      },
    ],
    address: {
      type: String,
      required: 'You must supply an address!',
    },
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // the author is going to be refered to the User schema/ a pointer arrow to another document
    required: 'You must supply an author',
  },
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text',
});

storeSchema.index({
  location: '2dsphere',
});

// slug 'middleware alike' setup
storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop this function from running (leave this middleware)
  }
  this.slug = slug(this.name); // if name was modified then run this
  // find stores that have the same store name via regex
  const slugRegex = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegex });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
  // TODO make more resiliant slugs
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    // the '$' means it is a filed inside the document like in '$tags"
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Lookup stores and populate their reviews
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews' /* agregatedReviewField_alias */,
      },
    },
    // filter for only items that have 2 or more reviews
    //* Pipe the next query
    {
      $match: {
        // matches the ones that the second item exists
        'reviews.1': { $exists: true },
      },
    },
    // add the average reviews field
    //* create a new field with the value of the average of the ratings.
    //** mongodb 3.4 has the $addField method */
    //*** 3.3< needs to add every field to be shown */
    {
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        // $ in $reviews.rating means it is from the piped in data
        averageRating: { $avg: '$reviews.rating' },
      },
    },
    // sort it by our new field, highest averages first
    { $sort: { averageRating: -1 } },
    // limit to at most 10
    { $limit: 10 },
  ]);
};

// find reviews where the stores _id property === reviews store property
storeSchema.virtual(
  'reviews',
  {
    ref: 'Review', // what model to link?
    localField: '_id', // which field on the sotre?
    foreignField: 'store',
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
