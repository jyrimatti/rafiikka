{-# LANGUAGE ScopedTypeVariables #-}

module Tooltips (
    initTooltips
) where

import Universum
import Language.Javascript.JSaddle (JSM, jsg2, Object, (<#), JSVal, (!), obj, FromJSVal (fromJSVal))
import FFI (function1)
import MutationObserver (onTitleChange)
import JSDOM.Generated.Element (removeAttribute)
import JSDOM.Types as JSDOM (Element)
import Tippy (setContent, tippy, interactive, placement, offset, content)
import JSDOM.Generated.ParentNode (querySelectorAll)
import Browser (debug, withDebug)
import Data.Text (pack)

titleUpdater :: JSDOM.Element -> JSVal -> JSM ()
titleUpdater reference _ = do
    debug "titleUpdater"
    title <- fromJSVal =<< reference ! pack "title"
    whenJust title $ \x -> do
        reference `setContent` x
        reference `removeAttribute` pack "title"

contentF :: JSDOM.Element -> JSM Text
contentF reference = do
    originalTitle <- fromJSVal =<< reference ! pack "title"
    reference `removeAttribute` pack "title"
    onTitleChange reference (titleUpdater reference)
    pure $ fromMaybe "" originalTitle

props :: JSM Object
props = do
    o <- obj
    o <# interactive $ True
    o <# placement $ pack "top"
    o <# offset $ [0 :: Int, 20]
    o <# content $ function1 contentF
    pure o

initTooltips :: JSDOM.Element -> JSM ()
initTooltips context = withDebug "initTooltips" $ do
    xs <- context `querySelectorAll` pack "[title]"
    _ <- jsg2 tippy xs props
    pure ()
