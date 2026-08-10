// Model definitions for easier management
const modelDefinitions = {
  body: [
    { id: "body_white", filename: "body_white.glb", displayName: "White", price: 5 },
    { id: "body_red", filename: "body_red.glb", displayName: "Red", price: 6 },
    { id: "body_orange", filename: "body_orange.glb", displayName: "Orange", price: 6 },
    { id: "body_yellow", filename: "body_yellow.glb", displayName: "Yellow", price: 6 },
    { id: "body_green", filename: "body_green.glb", displayName: "Green", price: 6 },
    { id: "body_blue", filename: "body_blue.glb", displayName: "Blue", price: 6 },
    { id: "body_purple", filename: "body_purple.glb", displayName: "Purple", price: 6 },
    { id: "body_black", filename: "body_black.glb", displayName: "Black", price: 6 },
    { id: "body_pirate", filename: "body_pirate.glb", displayName: "Pirate", price: 9 },
    { id: "body_welded", filename: "body_welded.glb", displayName: "Welded", price: 10 },
    { id: "body_heart", filename: "body_heart.glb", displayName: "Heart", price: 10 },
    { id: "body_star", filename: "body_star.glb", displayName: "Star", price: 10 },
    { id: "body_tryan", filename: "body_tryan.glb", displayName: "Tryan", price: 10 },
    { id: "body_pinhead", filename: "body_pinhead.glb", displayName: "Pinhead", price: 15 },
    { id: "body_creeper", filename: "body_creeper.glb", displayName: "Creeper", price: 25 },
    { id: "body_skeleton", filename: "body_skeleton.glb", displayName: "Skeleton", price: 50 },
    { id: "body_zombie", filename: "body_zombie.glb", displayName: "Zombie", price: 50 },
    { id: "body_circuitboard", filename: "body_circuitboard.glb", displayName: "Circuit Board", price: 20 },
    { id: "body_camo", filename: "body_camo.glb", displayName: "Camo", price: 15 },
    { id: "body_devil", filename: "body_devil.glb", displayName: "Devil", price: 666 },
    { id: "body_gold", filename: "body_gold.glb", displayName: "Gold", price: 1000 },
    { id: "body_transparent", filename: "body_transparent.glb", displayName: "Transparent", price: 30 },
  ],
  face: [
    { id: "face_smile", filename: "face_smile.glb", displayName: "Smile", price: 1 },
    { id: "face_eyes", filename: "face_eyes.glb", displayName: "Eyes", price: 1 },
    { id: "face_tryan", filename: "face_tryan.glb", displayName: "Tryan", price: 2 },
    { id: "face_cat", filename: "face_cat.glb", displayName: "Cat", price: 3 },
    { id: "face_chill", filename: "face_chill.glb", displayName: "Chill", price: 2 },
    { id: "face_angry", filename: "face_angry.glb", displayName: "Angry", price: 2 },
    { id: "face_bored", filename: "face_bored.glb", displayName: "Bored", price: 2 },
    { id: "face_buckteeth", filename: "face_buckteeth.glb", displayName: "Buckteeth", price: 2 },
    { id: "face_creeper", filename: "face_creeper.glb", displayName: "Creeper", price: 10 },
    { id: "face_drool", filename: "face_drool.glb", displayName: "Drool", price: 2 },
    { id: "face_gm", filename: "face_gm.glb", displayName: "GM", price: 5 },
    { id: "face_happy", filename: "face_happy.glb", displayName: "Happy", price: 2 },
    { id: "face_hmm", filename: "face_hmm.glb", displayName: "Hmm", price: 2 },
    { id: "face_joyful", filename: "face_joyful.glb", displayName: "Joyful", price: 2 },
    { id: "face_laughing", filename: "face_laughing.glb", displayName: "Laughing", price: 2 },
    { id: "face_neutral", filename: "face_neutral.glb", displayName: "Neutral", price: 2 },
    { id: "face_ok", filename: "face_ok.glb", displayName: "OK", price: 2 },
    { id: "face_pig", filename: "face_pig.glb", displayName: "Pig", price: 2 },
    { id: "face_scary", filename: "face_scary.glb", displayName: "Scary", price: 50 },
    { id: "face_skelly", filename: "face_skelly.glb", displayName: "Skelly", price: 5 },
    { id: "face_snout", filename: "face_snout.glb", displayName: "Snout", price: 2 },
    { id: "face_spider", filename: "face_spider.glb", displayName: "Spider", price: 20 },
    { id: "face_tripping", filename: "face_tripping.glb", displayName: "Tripping", price: 2 },
    { id: "face_vampire", filename: "face_vampire.glb", displayName: "Vampire", price: 5 },
    { id: "face_wink", filename: "face_wink.glb", displayName: "Wink", price: 2 },


  ],
  screen: [
    { id: "screen_green", filename: "screen_green.glb", displayName: "Green", price: 2 },
    { id: "screen_red", filename: "screen_red.glb", displayName: "Red", price: 3 },
    { id: "screen_orange", filename: "screen_orange.glb", displayName: "Orange", price: 3 },
    { id: "screen_yellow", filename: "screen_yellow.glb", displayName: "Yellow", price: 3 },
    { id: "screen_blue", filename: "screen_blue.glb", displayName: "Blue", price: 3 },
    { id: "screen_purple", filename: "screen_purple.glb", displayName: "Purple", price: 3 },
    { id: "screen_black", filename: "screen_black.glb", displayName: "Black", price: 3 },
    { id: "screen_broken", filename: "screen_broken.glb", displayName: "Broken", price: 5 },
    { id: "screen_scratched", filename: "screen_scratched.glb", displayName: "Scratched", price: 3 },
    { id: "screen_freckles", filename: "screen_freckles.glb", displayName: "Freckles", price: 3 },
    { id: "screen_tryan", filename: "screen_tryan.glb", displayName: "Tryan", price: 4 },
    { id: "screen_heisenberg", filename: "screen_heisenberg.glb", displayName: "Heisenberg", price: 5 },
    { id: "screen_pinhead", filename: "screen_pinhead.glb", displayName: "Pinhead", price: 10 },
  ],
  specs: [
    { id: "specs_1core2gb", filename: "specs_1core2gb.glb", displayName: "1 Core 2GB", price: 1 },
    { id: "specs_2core4gb", filename: "specs_2core4gb.glb", displayName: "2 Core 4GB", price: 2 },
    { id: "specs_4core8gb", filename: "specs_4core8gb.glb", displayName: "4 Core 8GB", price: 4 },
    { id: "specs_6core16gb", filename: "specs_6core16gb.glb", displayName: "6 Core 16GB", price: 6 },
    { id: "specs_8core32gb", filename: "specs_8core32gb.glb", displayName: "8 Core 32GB", price: 8 },
    { id: "specs_12core64gb", filename: "specs_12core64gb.glb", displayName: "12 Core 64GB", price: 12 },
    { id: "specs_18core128gb", filename: "specs_18core128gb.glb", displayName: "18 Core 128GB", price: 18 },
    { id: "specs_32core256gb", filename: "specs_32core256gb.glb", displayName: "32 Core 256GB", price: 32 },
    { id: "specs_64core512gb", filename: "specs_64core512gb.glb", displayName: "64 Core 512GB", price: 64 },
  ],
  accessories: {
    types: ["Clothes", "Face", "Head"],
    clothes: [
      { id: "none", filename: null, displayName: "None", price: 0 },
      { id: "accessories_clothes_drstrange", filename: "accessories_clothes_drstrange.glb", displayName: "Dr. Strange", price: 20 },
      { id: "accessories_clothes_link", filename: "accessories_clothes_link.glb", displayName: "Link", price: 20 },
      { id: "accessories_clothes_shell", filename: "accessories_clothes_shell.glb", displayName: "Shell", price: 10 },
      { id: "accessories_clothes_sweater", filename: "accessories_clothes_sweater.glb", displayName: "Sweater", price: 2 },
      { id: "accessories_clothes_backpack", filename: "accessories_clothes_backpack.glb", displayName: "Backpack", price: 1 },
      { id: "accessories_clothes_bigbackpack", filename: "accessories_clothes_bigbackpack.glb", displayName: "Backpack XL", price: 2 },
      { id: "accessories_clothes_radio", filename: "accessories_clothes_radio.glb", displayName: "Radio", price: 5 },
      { id: "accessories_clothes_rasta", filename: "accessories_clothes_rasta.glb", displayName: "Rasta", price: 10 },
      { id: "accessories_clothes_tshirt2", filename: "accessories_clothes_tshirt2.glb", displayName: "Flight Suit", price: 2 },
      { id: "accessories_clothes_tshirt", filename: "accessories_clothes_tshirt.glb", displayName: "T-Shirt", price: 2 },
      { id: "accessories_clothes_labcoat", filename: "accessories_clothes_labcoat.glb", displayName: "Lab Coat", price: 2 },
      { id: "accessories_clothes_nerd", filename: "accessories_clothes_nerd.glb", displayName: "Nerd", price: 2 },
      { id: "accessories_clothes_rippedcloths", filename: "accessories_clothes_rippedcloths.glb", displayName: "Ripped Cloths", price: 1 },
      { id: "accessories_clothes_coat", filename: "accessories_clothes_coat.glb", displayName: "Coat", price: 4 },
      { id: "accessories_clothes_disco", filename: "accessories_clothes_disco.glb", displayName: "Disco", price: 5 },
      { id: "accessories_clothes_suit", filename: "accessories_clothes_suit.glb", displayName: "Suit", price: 20 },
      { id: "accessories_clothes_hoodie", filename: "accessories_clothes_hoodie.glb", displayName: "Hoodie", price: 3 },
      { id: "accessories_clothes_leprechaun", filename: "accessories_clothes_leprechaun.glb", displayName: "Leprechaun", price: 3 },
      { id: "accessories_clothes_goku", filename: "accessories_clothes_goku.glb", displayName: "Goku", price: 7 },
      { id: "accessories_clothes_cloak", filename: "accessories_clothes_cloak.glb", displayName: "Cloak", price: 9 },
      { id: "accessories_clothes_santa", filename: "accessories_clothes_santa.glb", displayName: "Santa", price: 5 },
      { id: "accessories_clothes_pinhead", filename: "accessories_clothes_pinhead.glb", displayName: "Pinhead", price: 15 },
      { id: "accessories_clothes_scarecrow", filename: "accessories_clothes_scarecrow.glb", displayName: "Scarecrow", price: 10 },
      { id: "accessories_clothes_vampire", filename: "accessories_clothes_vampire.glb", displayName: "Vampire", price: 15 },
      { id: "accessories_clothes_dress", filename: "accessories_clothes_dress.glb", displayName: "Dress", price: 10 },
      { id: "accessories_clothes_subzero", filename: "accessories_clothes_subzero.glb", displayName: "Sub-Zero", price: 32 },
      { id: "accessories_clothes_argentine", filename: "accessories_clothes_argentine.glb", displayName: "Argentine", price: 2 },
      { id: "accessories_clothes_brazil", filename: "accessories_clothes_brazil.glb", displayName: "Brazil", price: 2 },
      { id: "accessories_clothes_france", filename: "accessories_clothes_france.glb", displayName: "France", price: 2 },
    ],
    face: [
      { id: "none", filename: null, displayName: "None", price: 0 },
      { id: "accessories_face_mask", filename: "accessories_face_mask.glb", displayName: "Mask", price: 1 },
      { id: "accessories_face_mask1", filename: "accessories_face_mask1.glb", displayName: "Mask 2", price: 1 },
      { id: "accessories_face_mask2", filename: "accessories_face_mask2.glb", displayName: "Mask 3", price: 1 },
      { id: "accessories_face_mask3", filename: "accessories_face_mask3.glb", displayName: "Mask 4", price: 1 },
      { id: "accessories_face_eyepatch", filename: "accessories_face_eyepatch.glb", displayName: "Eye Patch", price: 2 },
      { id: "accessories_face_skigoggles", filename: "accessories_face_skigoggles.glb", displayName: "Ski Goggles", price: 5 },
      { id: "accessories_face_beard", filename: "accessories_face_beard.glb", displayName: "Beard", price: 2 },
      { id: "accessories_face_nerd", filename: "accessories_face_nerd.glb", displayName: "Nerd Glasses", price: 1 },
      { id: "accessories_face_leprechaunbeard", filename: "accessories_face_leprechaunbeard.glb", displayName: "Leprechaun Beard", price: 2 },
      { id: "accessories_face_moustache", filename: "accessories_face_moustache.glb", displayName: "Moustache", price: 1 },
    ],
    head: [
      { id: "none", filename: null, displayName: "None", price: 0 },
      { id: "accessories_head_afro", filename: "accessories_head_afro.glb", displayName: "Afro", price: 2 },
      { id: "accessories_head_drstrange", filename: "accessories_head_drstrange.glb", displayName: "Dr. Strange", price: 2 },
      { id: "accessories_head_johnwick", filename: "accessories_head_johnwick.glb", displayName: "John Wick", price: 2 },
      { id: "accessories_head_rasta", filename: "accessories_head_rasta.glb", displayName: "Rasta", price: 10 },
      { id: "accessories_head_painterhat", filename: "accessories_head_painterhat.glb", displayName: "Painter Hat", price: 2 },
      { id: "accessories_head_morty", filename: "accessories_head_morty.glb", displayName: "Morty", price: 2 },
      { id: "accessories_head_rick", filename: "accessories_head_rick.glb", displayName: "Rick", price: 2 },
      { id: "accessories_head_piratehat", filename: "accessories_head_piratehat.glb", displayName: "Pirate", price: 5 },
      { id: "accessories_head_harleyquinn", filename: "accessories_head_harleyquinn.glb", displayName: "Harley Quinn", price: 2 },
      { id: "accessories_head_leprechaunhat", filename: "accessories_head_leprechaunhat.glb", displayName: "Leprechaun", price: 3 },
      { id: "accessories_head_razerkraken", filename: "accessories_head_razerkraken.glb", displayName: "Razer Kraken", price: 10 },
      { id: "accessories_head_razerkrakenkitty", filename: "accessories_head_razerkrakenkitty.glb", displayName: "Razer Kraken Kitty", price: 20 },
      { id: "accessories_head_goku", filename: "accessories_head_goku.glb", displayName: "Goku", price: 2 },
      { id: "accessories_head_gokussj", filename: "accessories_head_gokussj.glb", displayName: "SSJ", price: 5 },
      { id: "accessories_head_gokussjblue", filename: "accessories_head_gokussjblue.glb", displayName: "SSJ Blue", price: 20 },
      { id: "accessories_head_gokussjgod", filename: "accessories_head_gokussjgod.glb", displayName: "SSJ God", price: 100 },
      { id: "accessories_head_gokuultrainstinct", filename: "accessories_head_gokuultrainstinct.glb", displayName: "Ultra Instinct", price: 1000 },
      { id: "accessories_head_beanie", filename: "accessories_head_beanie.glb", displayName: "Beanie", price: 3 },
      { id: "accessories_head_hockeymask", filename: "accessories_head_hockeymask.glb", displayName: "Hockey Mask", price: 13 },
      { id: "accessories_head_wolfears", filename: "accessories_head_wolfears.glb", displayName: "Wolf Ears", price: 4 },
      { id: "accessories_head_antlers", filename: "accessories_head_antlers.glb", displayName: "Antlers", price: 2 },
      { id: "accessories_head_pumpkin", filename: "accessories_head_pumpkin.glb", displayName: "Pumpkin", price: 5 },
      { id: "accessories_head_scarecrow", filename: "accessories_head_scarecrow.glb", displayName: "Straw Hat", price: 1 },
      { id: "accessories_head_horns", filename: "accessories_head_horns.glb", displayName: "Horns", price: 3 },
      { id: "accessories_head_link", filename: "accessories_head_link.glb", displayName: "Link", price: 10 },
      { id: "accessories_head_headband", filename: "accessories_head_headband.glb", displayName: "Headband", price: 1 },
      { id: "accessories_head_googlyeyes", filename: "accessories_head_googlyeyes.glb", displayName: "Googly Eyes", price: 2 },
      { id: "accessories_head_helmet", filename: "accessories_head_helmet.glb", displayName: "Helmet", price: 3 },
      { id: "accessories_head_christmashat", filename: "accessories_head_christmashat.glb", displayName: "Christmas Hat", price: 3 },
      { id: "accessories_head_gandalfhat", filename: "accessories_head_gandalfhat.glb", displayName: "Gandalf", price: 2 },
      { id: "accessories_head_porkpie", filename: "accessories_head_porkpie.glb", displayName: "Pork Pie", price: 3 },
      { id: "accessories_head_wizardhat", filename: "accessories_head_wizardhat.glb", displayName: "Wizard Hat", price: 5 },
      { id: "accessories_head_skurpy", filename: "accessories_head_skurpy.glb", displayName: "Skurpy", price: 5 },
      { id: "accessories_head_birdnest", filename: "accessories_head_birdnest.glb", displayName: "Bird Nest", price: 10 },
      { id: "accessories_head_coffee", filename: "accessories_head_coffee.glb", displayName: "Cup o' Joe", price: 10 },
      { id: "accessories_head_taco", filename: "accessories_head_taco.glb", displayName: "Taco", price: 10 },
      { id: "accessories_head_lemon", filename: "accessories_head_lemon.glb", displayName: "Lemon", price: 5 },
      { id: "accessories_head_chompie", filename: "accessories_head_chompie.glb", displayName: "Chompie", price: 5 },
      { id: "accessories_head_anubis", filename: "accessories_head_anubis.glb", displayName: "Anubis", price: 20 },
    ]
  }
};

// Load the default models based on requirements
// Load the default models based on requirements
const loadDefaultModels = async () => {
  // Wait for gltf-transform to be ready
  let attempts = 0;
  while ((!gltfTransform || !gltfFunctions || !window.gltfExtensions) && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!gltfTransform || !gltfFunctions || !window.gltfExtensions) {
    log("ERROR: gltf-transform or extensions failed to load after 5 seconds");
    return;
  }
  
  log("gltf-transform ready, loading default models");
  
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