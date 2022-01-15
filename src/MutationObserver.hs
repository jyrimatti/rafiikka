{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-incomplete-uni-patterns #-}

module MutationObserver (
    onTitleChange,
    onStyleChange,
    onAttributeMutation
) where

import Language.Javascript.JSaddle (JSM, (#), ToJSVal (toJSVal), (<#), new, jsg, FromJSVal (fromJSVal), obj)
import Data.Text (Text, pack)
import FFI (procedure1)
import Data.Foldable (traverse_)
import Data.Maybe ( fromJust )

onAttributeMutation :: (ToJSVal e, FromJSVal a) => Text -> e -> (a -> JSM ()) -> JSM ()
onAttributeMutation attribute element callback = do
    observer <- new (jsg "MutationObserver") $ toJSVal $ procedure1 $ \(mutations :: [a]) -> do
        as <- traverse fromJSVal mutations
        traverse_ (callback . fromJust) as
    o <- obj
    o <# "attributes" $ True
    o <# "attributeFilter" $ [attribute]
    _ <- observer # "observe" $ (element, o)
    pure ()

onTitleChange :: (ToJSVal e, FromJSVal a) => e -> (a -> JSM ()) -> JSM ()
onTitleChange = onAttributeMutation $ pack "title"

onStyleChange :: (ToJSVal e, FromJSVal a) => e -> (a -> JSM ()) -> JSM ()
onStyleChange = onAttributeMutation $ pack "style"
