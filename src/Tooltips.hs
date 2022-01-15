{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TypeApplications #-}

module Tooltips (
    initTooltips
) where

import Language.Javascript.JSaddle (JSM, jsg2, Object, (<#), JSVal, (!), obj, FromJSVal (fromJSVal))
import Data.Text (Text, pack)
import FFI (function1)
import Data.Foldable (forM_)
import MutationObserver (onTitleChange)
import JSDOM.Generated.Element (removeAttribute)
import JSDOM.Types (Element)
import Tippy (setContent, tippy, interactive, placement, offset, content)
import JSDOM.Generated.ParentNode (querySelectorAll)
import Data.Maybe (fromMaybe)
import Shpadoinkle.Console (debug)

titleUpdater :: Element -> JSVal -> JSM ()
titleUpdater reference _ = do
    debug @Show "titleUpdater"
    title <- fromJSVal =<< reference ! "title"
    forM_ title $ \x -> do
        reference `setContent` x
        reference `removeAttribute` "title"

contentF :: Element -> JSM Text
contentF reference = do
    originalTitle <- fromJSVal =<< reference ! "title"
    reference `removeAttribute` "title"
    onTitleChange reference (titleUpdater reference)
    pure $ fromMaybe (pack "") originalTitle

props :: JSM Object
props = do
    o <- obj
    o <# interactive $ True
    o <# placement $ "top"
    o <# offset $ [0 :: Int, 20]
    o <# content $ function1 contentF
    pure o

initTooltips :: Element -> JSM ()
initTooltips context = do
    debug @Show "initTooltips"
    elems <- context `querySelectorAll` "[title]"
    _ <- jsg2 tippy elems props
    pure ()
