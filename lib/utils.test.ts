import { describe, it, expect } from "vitest"
import { computeMd5 } from "./utils"

describe("computeMd5", () => {
  it("should return correct MD5 for a simple string", () => {
    const input = "Hello, world!"
    // precomputed MD5 for the string above using any online tool or Node
    const expected = "6cd3556deb0da54bca060b4c39479839"
    expect(computeMd5(input)).toBe(expected)
  })

  it("should produce same checksum when mocking file content", () => {
    const fakeFileContent = "patient-data: 12345"
    const expected = "476140d397f744779c41320368f068c8"
    expect(computeMd5(fakeFileContent)).toBe(expected)
  })
})
