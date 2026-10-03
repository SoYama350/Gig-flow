# Testing output evidence

## Command

```bash
cd web
npm test -- --reporter=verbose
npm run test:coverage -- --reporter=verbose
```

## Result

- 2 test files passed
- 8 tests passed
- Coverage report generated for the project with the Prisma-generated files excluded

## Notes

The critical flow and AI validation paths are covered in the project’s automated tests. Coverage is still low for broader legacy components because the repository has many untested screens, but the actual app workflow is covered and passing.
