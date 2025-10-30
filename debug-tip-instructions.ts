// Debug tip instructions format
const tipResponse = {
  "accounts": [{
    "address": "GcNc8BA8p5aYBark3mmQGmNshWrATMg5FVFhEvzd8TJ2",
    "role": 3
  }, {
    "address": "49iMaeMNdyFYWXFo6mbkT7jew2X8F6QR4b8GXpbafRpg",
    "role": 1
  }],
  "programAddress": "11111111111111111111111111111111",
  "data": {
    "0": 2, "1": 0, "2": 0, "3": 0,
    "4": 32, "5": 161, "6": 7, "7": 0,
    "8": 0, "9": 0, "10": 0, "11": 0
  }
};

// My current parsing
const dataBytes = new Uint8Array(Object.values(tipResponse.data));
console.log("Parsed data:", dataBytes);
console.log("Data as hex:", Buffer.from(dataBytes).toString('hex'));

// Decode transfer instruction
console.log("\nTransfer instruction:");
console.log("- Type:", dataBytes[0]); // Should be 2 for transfer
console.log("- Amount (little-endian):", 
  dataBytes[4] | (dataBytes[5] << 8) | (dataBytes[6] << 16) | (dataBytes[7] << 24)
);
