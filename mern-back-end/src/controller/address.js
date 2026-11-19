const UserAddress = require("../models/address");

exports.addAddress = async (req, res) => {
  try {
    const address = req.body?.payload?.address;
    if (!address) {
      return res.status(400).json({ error: "Params address required" });
    }

    let result;
    if (address._id) {
      result = await UserAddress.findOneAndUpdate(
        { user: req.auth.userId, "address._id": address._id },
        { $set: { "address.$": address } },
        { returnDocument: "after", runValidators: true }
      ).exec();
      if (!result) return res.status(404).json({ error: "Address not found" });
      return res.status(201).json({ address: result });
    }

    result = await UserAddress.findOneAndUpdate(
      { user: req.auth.userId },
      { $push: { address } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).exec();
    return res.status(201).json({ address: result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getAddress = async (req, res) => {
  try {
    const userAddress = await UserAddress.findOne({ user: req.auth.userId }).exec();
    return res.status(200).json({ userAddress: userAddress || { address: [] } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
