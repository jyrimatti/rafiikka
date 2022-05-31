{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-incomplete-uni-patterns #-}
{-# LANGUAGE TypeApplications #-}

module Browser.MutationObserver (
    onTitleChange,
    onStyleChange,
    onAttributeMutation
) where

import Universum
import Language.Javascript.JSaddle (JSM, (#), ToJSVal (toJSVal), (<#), new, jsg, FromJSVal (fromJSVal), obj, JSString)
import FFI (procedure1)
import Data.Maybe ( fromJust )
import Data.Text (pack)

onAttributeMutation :: (ToJSVal e, FromJSVal a) => Text -> e -> (a -> JSM ()) -> JSM ()
onAttributeMutation attribute element callback = do
    observer <- new (jsg @JSString "MutationObserver") $ toJSVal $ procedure1 $ \(mutations :: [a]) -> do
        as <- traverse fromJSVal mutations
        traverse_ (callback . fromJust) as
    o <- obj
    o <# pack "attributes" $ True
    o <# pack "attributeFilter" $ [attribute]
    _ <- observer # pack "observe" $ (element, o)
    pure ()

onTitleChange :: (ToJSVal e, FromJSVal a) => e -> (a -> JSM ()) -> JSM ()
onTitleChange = onAttributeMutation "title"

onStyleChange :: (ToJSVal e, FromJSVal a) => e -> (a -> JSM ()) -> JSM ()
onStyleChange = onAttributeMutation "style"
