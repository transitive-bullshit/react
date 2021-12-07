# ADR 003: Prop norms in Primer React Components

## Status

Proposed

_Note: These are in no way rules, these should be treated as a starting point for API conversations._

## Prefer using children for “content”

With React, `children` is the out-of-the-box way for putting _content_ inside your component. By using `children` instead our own custom prop, we can make the API “predictable” for its consumers.

<img width="373" alt="image" src="https://user-images.githubusercontent.com/1863771/144945223-70c4c800-5827-4985-9f18-0ab416eba058.png">

```jsx
// prefer this
<Flash variant="success">Changes saved!</Flash>
// over this
<Flash variant="success" text="Changes saved!"/>
```

Children as an API for content is an open and composable approach. The contract here is that the `Flash` controls the container while the consumer of the component controls how the contents inside look.

Take this example of composition:

<img width="377" alt="flash with icon" src="https://user-images.githubusercontent.com/1863771/144945208-308393e0-013d-45a9-a14d-a51bf4d4cfad.png">

```jsx
import {Flash} from '@primer/react'
import {CheckIcon} from '@primer/octicons-react'

render(
  <Flash variant="success">
    <CheckIcon /> Changes saved!
  </Flash>
)
```

Pros of this approach here:

1. The component is aware of recommended use cases and comes with those design decisions backed-in. For example, using an `Icon` with `Flash` is a recognised use case. We don’t lock-in a specific icons, but we do set the size, variant-compatible color and the margin between the icon and text.

   For example:

     <img width="373" alt="flash variants" src="https://user-images.githubusercontent.com/1863771/144945213-a16fe4a3-af07-4b10-9bcb-369ec0f35a77.png">

   ```jsx
   <Flash variant="success">
     <CheckIcon /> Changes saved!
   </Flash>
   <Flash variant="danger">
     <AlertIcon /> Your changes were not saved!
   </Flash>
   ```

Continued pros:

2. You can bring your own icon components, the component does not depend on a specific version of octicons.
3. When a product team wants to explore a use cases which isn’t baked into the component, they are not blocked by our team.

   Example:

   <img width="375" alt="flash with icon and close" src="https://user-images.githubusercontent.com/1863771/144945209-1480b9f5-895d-458d-8c68-4ce7b6d6b7b4.png">

   ```jsx
   <Flash variant="success" sx={{display: 'flex', justifyContent: 'space-between'}}>
     <span>
       <CheckIcon /> Changes saved!
     </span>
     <Button variant="invisible" icon={CheckIcon} aria-label="Hide flash message" onClick={onDismiss} />
   </Flash>
   ```

### Tradeoffs of this approach / When not to use children

Putting all content as in children isn’t a silver bullet. Composition gives flexibility of contents to the consumer, this flexibility however can lead to inconsistencies.

<img width="375" alt="image 6" src="https://user-images.githubusercontent.com/1863771/144945216-6237084d-3d97-45c7-9505-6aed473afb03.png">

```jsx
<Flash variant="success">
  // oh oh, we don't know if that color or icon size is the right choice!
  <CheckIcon size={20} color="success.emphasis" /> Changes saved!
</Flash>

<Flash variant="success">
  <CheckIcon /> Changes saved!
</Flash>
```

_Note: We need to assume good intent here, folks using the components aren’t trying to break the system. They are either trying to implement something that the system’s happy path does not support OR there are multiple ways of doing something with primer and they have unintentionally picked the approach that is not recommended._

The general wisdom is to _Make the right (recommended) thing easy to do and the wrong (not recommended) hard to do_. When going off the happy path, developers should feel some friction, some weight, code that “feels wrong” or “feels hacky”.

In the above case, if we want to make the recommended path easier and other paths harder, we can change the API to look something like this -

```jsx
<Flash variant="success" icon={CheckIcon}>
  Changes saved!
</Flash>
```

We are still using `children` for text content, but we have moved the `icon` back as a prop with reduced flexibility.

\*_Side note: We might want to name this prop `leadingIcon`, even if there is no `trailingIcon`. Consistent names across components plays a big role in making the API predictable._

When intentionally going off the happy path, developers can still drop down an abstraction level add an `Icon` to `children`, they would have to pick up the additional effort of setting compatible color, size and margin themselves. However, when it’s unintentional, it would feel like way too much work that the component should be doing automatically.

```jsx
<Flash variant="success">
  <CheckIcon size={20} color="success.emphasis" sx={{marginRight: 2}} />
  Changes saved!
</Flash>
```

---

You can see this pattern used in `NewButton`:

<img width="141" alt="image 9" src="https://user-images.githubusercontent.com/1863771/144945219-a853ed1c-f21d-412e-a388-6d74ec436645.png">

```jsx
<Button leadingIcon={SearchIcon}>Search</Button>
<Button leadingIcon={SearchIcon} variant="primary" size="large">Search</Button>
```

The icon gets its color and margin based on the variant and size of the `Button`. This is the happy path we want folks to be on, so we ask for the icon component instead of asking the developer to render the icon.

```jsx
// prefer this:
<NewButton leadingIcon={SearchIcon}>Search</NewButton>
// over these:
<NewButton><SearchIcon/> Search</NewButton>
<NewButton leadingIcon={<SearchIcon/>}>Search</NewButton>
```

---

## Flexibility is a spectrum and the case for composite components

### There are scenarios where we want to restrict flexibility and bake-in design decisions for the most part, but allow some configuration.

Consider this fake example:

<img width="388" alt="image 7" src="https://user-images.githubusercontent.com/1863771/144945217-fd5eeab0-bfa5-4c53-9add-621dcd87b48c.png">

We want users to be able to customise if the `Icon` is outline or filled. (I know I know the example is bit silly, but please go with it)

Extending our `strict` API, we could add another prop to the component:

```jsx
<Flash variant="success" icon={CheckIcon} iconVariant="filled">
  Changes saved!
</Flash>
```

When we have an “element” and “elementProp” as props on a component, it’s a sign that we should create a child component here that is tied to the parent component:

```jsx
<Flash variant="success">
  <Flash.Icon icon={CheckIcon} variant="filled" />
  Changes saved!
</Flash>
```

The `Parent.Child` syntax signals that this component is tied to the parent.

We can look at `Flash.Icon` as a stricter version of `Icon` that automatically works with different variants of `Flash`. It does not need to support all the props of `Icon` like size or color, only the ones that are compatible in the context of a `Flash`.

_Note: We might want to name this component `Flash.LeadingIcon`, even if there is no `trailingIcon`. We should try to keep the names consistent across components with the same behavior, but that should not be a deciding factor in making the choice between prop or child component._

_Note #2: On the surface it looks we have also removed the `sx` prop for the Icon but because the `sx` prop supports nesting, there is always a way to override styles for better or worse:_

```jsx
<Flash variant="success" icon={CheckIcon} sx={{svg: {path: {fill: 'lime'}}}}>
  Changes saved!
</Flash>
```

---

We use this pattern in `NewButton`, `Button.Counter` is a restricted version of `CounterLabel` that automatically adjusts based on the variant and size of a `Button`:

<img width="184" alt="image 8" src="https://user-images.githubusercontent.com/1863771/144945218-5154b8a1-8854-4335-926c-08a4ffac6d9d.png">

```jsx
<NewButton>
  Watch <NewButton.Counter>1</NewButton.Counter>
</NewButton>

<NewButton variant="primary">
  Upvote <NewButton.Counter>1</NewButton.Counter>
</NewButton>
```

---

### Exposing customisation options for internal components:

Another place where composite patterns lead to aesthetic predictable API is when we want to expose customisation options for internal components:

<img width="337" alt="image 10" src="https://user-images.githubusercontent.com/1863771/144945221-b6a4e7f0-5134-4485-bfd0-1e4b2e77a70e.png">

```jsx
<ActionMenu overlayProps={{width: 'medium'}}>
  <ActionMenu.Button>Open column menu</ActionMenu.Button>
  <ActionList>...</ActionList>
</ActionMenu>
```

When we see a a prop which resembles “childProps" on the parent, it's a sign that we could create a composite component:

```jsx
// we created an additional layer so that
// the overlay props go on the overlay
<ActionMenu>
  <ActionMenu.Button>Open column menu</ActionMenu.Button>
  <ActionMenu.Overlay width="medium">
    <ActionList>...</ActionList>
  </ActionMenu.Overlay>
</ActionMenu>
```

---

### Layout components with unstructured content

In components where there is a place for freeform or unstructured content for the component consumer to fill in, we should prefer the composite components API:

Consider this fake `Flash` example where description is unstructured content:

<img width="599" alt="image 11" src="https://user-images.githubusercontent.com/1863771/144945222-91b2e7c8-479e-4076-833f-824c29b93f61.png">

```jsx
// prefer this:
<Flash variant="success" icon={CheckIcon}>
  <Flash.Title>Changes saved</Flash.Title>
  <Flash.Description>
    These changes will be applied to your next build. <Link href="/docs/builds">Learn more about builds.</Link>
   </Flash.Description>
</Flash>

// over this:
// Trying to systemise content by finding patterns in
// unconstructured content can lead to overly prescriptive API
// that is not prectictable and hard to remember
<Flash
   icon={CheckIcon}
	variant="success"
 	text="Changes saved"
	description="These changes will be applied to your next build."
   linkUrl="/docs/builds"
   linkText="Learn more about builds."
/>
```

_Sidenote: It’s tempting to change `icon` to `Flash.Icon` here so that it’s consistent with the rest of the contents. This is a purely aesthetic choice at this point:_

```jsx
<Flash variant="success">
  <Flash.Icon icon={CheckIcon} />
  <Flash.Title>Changes saved</Flash.Title>
  <Flash.Description>
    These changes will be applied to your next build. <a href="/docs/builds">Learn more about builds.</a>
  </Flash.Description>
</Flash>
```

---

We use this pattern in `ActionList v2` :

<img width="484" alt="actionlist" src="https://user-images.githubusercontent.com/1863771/144945215-253e2af5-37ae-40d8-bc1c-7a75780428be.png">

```jsx
<ActionList showDividers>
  <ActionList.Item>
    <ActionList.LeadingVisual><Avatar src="1.png"/></ActionList.LeadingVisual>
    mona
    <ActionList.Description>Monalisa Octocat</ActionList.Description>
  <ActionList.Item>
  <ActionList.Item>
    <ActionList.LeadingVisual><Avatar src="2.png"/></ActionList.LeadingVisual>
    primer-css
    <ActionList.Description variant="block">GitHub</ActionList.Description>
  <ActionList.Item>
</ActionList>
```