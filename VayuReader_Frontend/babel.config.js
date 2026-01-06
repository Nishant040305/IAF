// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
//     plugins: [
//       [
//         "module-resolver",
//         {
//           root: ["./"],
//           alias: { "@": "./" },
//         },
//       ],
//       "nativewind/babel",
//       "react-native-reanimated/plugin", // MUST be last
//     ],
//   };
// };

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: { "@": "./" },
        },
      ],
      "nativewind/babel",
      "react-native-reanimated/plugin", // MUST be last
    ],
  };
};
