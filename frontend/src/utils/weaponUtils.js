// src/utils/weaponUtils.js
export const getWeaponImageUrl = (weaponName) => {
  if (!weaponName) return '';
  
  // Convert weapon name to image file name
  const weaponToImage = {
    'Bow': 'Bow Art.png',
    'Crossbow': 'Crossbow Art.png',
    'Dagger': 'Dagger Art.png',
    'Greatsword': 'Greatsword Art.png',
    'Spear': 'Spear Art.png',
    'Staff': 'Staff Art.png',
    'Sword and Shield': 'Sword and Shield Art.png',
    'Wand': 'Wand Art.png'
  };
  
  const imageName = weaponToImage[weaponName];
  // Using the same path pattern as in your MembersList.jsx
  return imageName ? `${process.env.PUBLIC_URL}/weapons/${imageName}` : '';
};

export const getWeaponComponents = (builds) => {
  const primaryBuild = builds && 
                      Array.isArray(builds) && 
                      builds.length > 0 
                      ? builds[0] 
                      : null;
                      
  // Check both property names to be compatible with your data structure
  const primaryWeapon = primaryBuild?.primary || primaryBuild?.primaryWeapon || '';
  const secondaryWeapon = primaryBuild?.secondary || primaryBuild?.secondaryWeapon || '';
  
  return {
    primaryWeapon,
    secondaryWeapon,
    primaryWeaponImageUrl: getWeaponImageUrl(primaryWeapon),
    secondaryWeaponImageUrl: getWeaponImageUrl(secondaryWeapon)
  };
};