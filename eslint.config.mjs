import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // any 타입을 경고로 변경
      "@typescript-eslint/no-unused-vars": "warn", // 사용하지 않는 변수를 경고로 변경
      "@typescript-eslint/no-require-imports": "warn", // require 사용을 경고로 변경
      "@typescript-eslint/no-empty-object-type": "warn", // 빈 객체 타입을 경고로 변경
      "react/no-unescaped-entities": "warn", // 이스케이프되지 않은 엔티티를 경고로 변경
      "react-hooks/exhaustive-deps": "warn", // useEffect 의존성을 경고로 변경
      "@next/next/no-img-element": "warn", // img 태그 사용을 경고로 변경
    },
  },
];

export default eslintConfig;
