'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

const AvatarCustomizer = ({ onSelect }) => {
  // Customization options
  const skinColors = ['🏻', '🏼', '🏽', '🏾', '🏿'];
  //const accessories = ['🎩', '👑', '🎀', '🧢', '👓', '🕶️', '🪖', '🎭'];
  const baseCharacters = ['🎩', '👑', '🎀', '🧢', '👓', '🕶️', '🪖', '🎭'];
  
  const [selectedCharacter, setSelectedCharacter] = useState(baseCharacters[0]);
  const [selectedAccessory, setSelectedAccessory] = useState(null);

  const handleSelect = (character, accessory) => {
    const avatar = {
      character,
      accessory,
      display: accessory ? `${accessory}${character}` : character
    };
    onSelect(avatar);
  };

  return (
    <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold text-center mb-4">اختر شخصيتك</h3>
      
      {/* Preview */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-2 relative inline-block">
          {selectedCharacter}
          {selectedAccessory && (
            <span className="absolute top-[-20px] left-1/2 transform -translate-x-1/2">
              {selectedAccessory}
            </span>
          )}
        </div>
      </div>

      {/* Character Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2">الشخصية</h4>
        <div className="grid grid-cols-3 gap-2">
          {baseCharacters.map((char, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setSelectedCharacter(char);
                handleSelect(char, selectedAccessory);
              }}
              className={`text-3xl p-2 rounded-lg ${
                selectedCharacter === char ? 'bg-[#FF9A8B]/20' : 'hover:bg-gray-100'
              }`}
            >
              {char}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Accessories Selection
      <div>
        <h4 className="text-sm font-semibold mb-2">الإكسسوارات</h4>
        <div className="grid grid-cols-4 gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setSelectedAccessory(null);
              handleSelect(selectedCharacter, null);
            }}
            className={`text-2xl p-2 rounded-lg ${
              !selectedAccessory ? 'bg-[#FF9A8B]/20' : 'hover:bg-gray-100'
            }`}
          >
            ❌
          </motion.button>
          {accessories.map((acc, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setSelectedAccessory(acc);
                handleSelect(selectedCharacter, acc);
              }}
              className={`text-2xl p-2 rounded-lg ${
                selectedAccessory === acc ? 'bg-[#FF9A8B]/20' : 'hover:bg-gray-100'
              }`}
            >
              {acc}
            </motion.button>
          ))}
        </div>
      </div> */}
    </div>
  );
};

export default AvatarCustomizer; 