// Model definitions for easier management
const modelDefinitions = {
  body: [
    { id: "body_white", filename: "body_white.glb", displayName: "White", price: 5 },
    { id: "body_green", filename: "body_green.glb", displayName: "Green", price: 6 },
    { id: "body_tryan", filename: "body_tryan.glb", displayName: "Tryan", price: 10 },
    { id: "body_circuitboard", filename: "body_circuitboard.glb", displayName: "Circuit Board", price: 20 },
  ],
  face: [
    { id: "face_smile", filename: "face_smile.glb", displayName: "Smile", price: 1 },
    { id: "face_eyes", filename: "face_eyes.glb", displayName: "Eyes", price: 1 },
    { id: "face_tryan", filename: "face_tryan.glb", displayName: "Tryan", price: 2 },
    { id: "face_cat", filename: "face_cat.glb", displayName: "Cat", price: 3 },
  ],
  screen: [
    { id: "screen_green", filename: "screen_green.glb", displayName: "Green", price: 2 },
    { id: "screen_tryan", filename: "screen_tryan.glb", displayName: "Tryan", price: 4 },
  ],
  specs: [
    { id: "specs_1core2gb", filename: "specs_1core2gb.glb", displayName: "1 Core 2GB", price: 1 },
    { id: "specs_18core128gb", filename: "specs_18core128gb.glb", displayName: "18 Core 128GB", price: 18 },
    { id: "specs_32core256gb", filename: "specs_32core256gb.glb", displayName: "32 Core 256GB", price: 32 },
  ],
  accessories: {
    types: ["Clothes", "Face", "Head"],
    clothes: [
      { id: "none", filename: null, displayName: "None", price: 0 },
      { id: "accessories_clothes_drstrange", filename: "accessories_clothes_drstrange.glb", displayName: "Dr. Strange", price: 20 },
      { id: "accessories_clothes_link", filename: "accessories_clothes_link.glb", displayName: "Link", price: 20 },
      { id: "accessories_clothes_shell", filename: "accessories_clothes_shell.glb", displayName: "Shell", price: 10 },
      { id: "accessories_clothes_backpack", filename: "accessories_clothes_backpack.glb", displayName: "Backpack", price: 1 },
      { id: "accessories_clothes_bigbackpack", filename: "accessories_clothes_bigbackpack.glb", displayName: "Backpack XL", price: 2 },
      { id: "accessories_clothes_coat", filename: "accessories_clothes_coat.glb", displayName: "Coat", price: 4 },
      { id: "accessories_clothes_goku", filename: "accessories_clothes_goku.glb", displayName: "Goku", price: 7 },
      { id: "accessories_clothes_cloak", filename: "accessories_clothes_cloak.glb", displayName: "Cloak", price: 5 },
      { id: "accessories_clothes_argentine", filename: "accessories_clothes_argentine.glb", displayName: "Argentine", price: 2 },
      { id: "accessories_clothes_brazil", filename: "accessories_clothes_brazil.glb", displayName: "Brazil", price: 2 },
      { id: "accessories_clothes_france", filename: "accessories_clothes_france.glb", displayName: "France", price: 2 },
    ],
    face: [
      { id: "none", filename: null, displayName: "None", price: 0 },
      { id: "accessories_face_mask", filename: "accessories_face_mask.glb", displayName: "Mask", price: 1 },
      { id: "accessories_face_beard", filename: "accessories_face_beard.glb", displayName: "Beard", price: 2 },
      { id: "accessories_face_leprechaunbeard", filename: "accessories_face_leprechaunbeard.glb", displayName: "Leprechaun Beard", price: 2 },
    ],
    head: [
      { id: "none", filename: null, displayName: "None", price: 0 },
      { id: "accessories_head_wolfears", filename: "accessories_head_wolfears.glb", displayName: "Wolf Ears", price: 2 },
      { id: "accessories_head_link", filename: "accessories_head_link.glb", displayName: "Link", price: 10 },
      { id: "accessories_head_afro", filename: "accessories_head_afro.glb", displayName: "Afro", price: 2 },
      { id: "accessories_head_drstrange", filename: "accessories_head_drstrange.glb", displayName: "Dr. Strange", price: 2 },
      { id: "accessories_head_goku", filename: "accessories_head_goku.glb", displayName: "Goku", price: 2 },
      { id: "accessories_head_gokussj", filename: "accessories_head_gokussj.glb", displayName: "SSJ", price: 5 },
      { id: "accessories_head_gokussjblue", filename: "accessories_head_gokussjblue.glb", displayName: "SSJ Blue", price: 20 },
      { id: "accessories_head_gokussjgod", filename: "accessories_head_gokussjgod.glb", displayName: "SSJ God", price: 100 },
      { id: "accessories_head_gokuultrainstinct", filename: "accessories_head_gokuultrainstinct.glb", displayName: "Ultra Instinct", price: 1000 },
      { id: "accessories_head_beanie", filename: "accessories_head_beanie.glb", displayName: "Beanie", price: 3 },
      { id: "accessories_head_googlyeyes", filename: "accessories_head_googlyeyes.glb", displayName: "Googly Eyes", price: 2 },
      { id: "accessories_head_christmashat", filename: "accessories_head_christmashat.glb", displayName: "Christmas Hat", price: 3 },
      { id: "accessories_head_birdnest", filename: "accessories_head_birdnest.glb", displayName: "Bird Nest", price: 10 },
      { id: "accessories_head_eyepatch", filename: "accessories_head_eyepatch.glb", displayName: "Eye Patch", price: 2 },
      { id: "accessories_head_coffee", filename: "accessories_head_coffee.glb", displayName: "Cup o' Joe", price: 10 },
      { id: "accessories_head_chompie", filename: "accessories_head_chompie.glb", displayName: "Chompie", price: 5 },
      { id: "accessories_head_anubis", filename: "accessories_head_anubis.glb", displayName: "Anubis", price: 20 },
    ]
  }
};

// Load the default models based on requirements
const loadDefaultModels = () => {
  // Body: white
  const bodyModel = modelDefinitions.body[0]; // White body
  if (bodyModel) loadModel(bodyModel, 'body');
  
  // Face: smile
  const faceModel = modelDefinitions.face[0]; // Smile face
  if (faceModel) loadModel(faceModel, 'face');
  
  // Screen: green
  const screenModel = modelDefinitions.screen[0]; // Green screen
  if (screenModel) loadModel(screenModel, 'screen');
  
  // Specs: 1 core
  const specsModel = modelDefinitions.specs[0]; // 1 Core 2GB
  if (specsModel) loadModel(specsModel, 'specs');
  
  // Accessories: None by default (handled by not loading any)
};