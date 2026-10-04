const assets = [
  {
    name: "room",
    type: "glbModel",
    path: "/models/Room.glb",
  },
  {
    name: "hitboxes",
    type: "glbModel",
    path: "/models/Hitboxes.glb",
  },
  {
    name: "goboTexture",
    type: "texture",
    path: "/textures/gobo.jpg",
  },
  {
    name: "butterflyWingTexture",
    type: "texture",
    path: "/textures/butterfly_wing.webp",
  },
  {
    name: "firstTexture",
    type: "ktx2",
    path: `/textures/day/first-house_day.ktx2`,
  },
  {
    name: "secondTexture",
    type: "ktx2",
    path: `/textures/day/second-photos_day.ktx2`,
  },
  {
    name: "thirdTexture",
    type: "ktx2",
    path: `/textures/day/third-desk_day.ktx2`,
  },
  {
    name: "fourthTexture",
    type: "ktx2",
    path: `/textures/day/fourth-extras_day.ktx2`,
  },
  {
    name: "fifthTexture",
    type: "ktx2",
    path: `/textures/day/fifth-background_day.ktx2`,
  },
  {
    name: "sixthTexture",
    type: "ktx2",
    path: `/textures/day/sixth-plants_day.ktx2`,
  },
  {
    name: "seventhTexture",
    type: "ktx2",
    path: `/textures/day/seventh-large-stuff_day.ktx2`,
  },
  {
    name: "eighthTexture",
    type: "ktx2",
    path: `/textures/day/eighth-decor_day.ktx2`,
  },
  {
    name: "ninthTexture",
    type: "ktx2",
    path: `/textures/day/ninth-attachment_day.ktx2`,
  },
  {
    name: "firstNightTexture",
    type: "ktx2",
    path: `/textures/night/first-house_night.ktx2`,
  },
  {
    name: "secondNightTexture",
    type: "ktx2",
    path: `/textures/night/second-photos_night.ktx2`,
  },
  {
    name: "thirdNightTexture",
    type: "ktx2",
    path: `/textures/night/third-desk_night.ktx2`,
  },
  {
    name: "fourthNightTexture",
    type: "ktx2",
    path: `/textures/night/fourth-extras_night.ktx2`,
  },
  {
    name: "fifthNightTexture",
    type: "ktx2",
    path: `/textures/night/fifth-background_night.ktx2`,
  },
  {
    name: "sixthNightTexture",
    type: "ktx2",
    path: `/textures/night/sixth-plants_night.ktx2`,
  },
  {
    name: "seventhNightTexture",
    type: "ktx2",
    path: `/textures/night/seventh-large-stuff_night.ktx2`,
  },
  {
    name: "eighthNightTexture",
    type: "ktx2",
    path: `/textures/night/eighth-decor_night.ktx2`,
  },
  {
    name: "ninthNightTexture",
    type: "ktx2",
    path: `/textures/night/ninth-attachment_night.ktx2`,
  },
  // {
  //   name: "skybox",
  //   type: "skybox",
  //   path: [
  //     "/textures/skybox/px.png",
  //     "/textures/skybox/nx.png",
  //     "/textures/skybox/py.png",
  //     "/textures/skybox/ny.png",
  //     "/textures/skybox/pz.png",
  //     "/textures/skybox/nz.png",
  //   ],
  // },
];

export const nightAssets = assets.filter(asset => asset.name.includes("Night"));
export default assets.filter(asset => !asset.name.includes("Night"));
