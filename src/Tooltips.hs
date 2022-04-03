{-# LANGUAGE ScopedTypeVariables, OverloadedStrings #-}

module Tooltips (
    initTooltips
) where

import Universum
import Language.Javascript.JSaddle (JSM, jsg2, Object, (<#), JSVal, (!), obj, FromJSVal (fromJSVal), JSString)
import FFI (function1)
import MutationObserver (onTitleChange)
import JSDOM.Generated.Element (removeAttribute)
import JSDOM.Types as JSDOM (Element)
import Tippy (setContent, tippy, interactive, placement, offset, content)
import JSDOM.Generated.ParentNode (querySelectorAll)
import Browser (withDebug)

titleUpdater :: JSDOM.Element -> JSVal -> JSM ()
titleUpdater reference _ = withDebug "titleUpdater" $ do
    title <- fromJSVal =<< reference ! ("title" :: JSString)
    whenJust title $ \x -> do
        reference `setContent` x
        reference `removeAttribute` ("title" :: JSString)

contentF :: JSDOM.Element -> JSM Text
contentF reference = withDebug "contentF" $ do
    originalTitle <- fromJSVal =<< reference ! ("title" :: JSString)
    reference `removeAttribute` ("title" :: JSString)
    onTitleChange reference (titleUpdater reference)
    pure $ fromMaybe "" originalTitle

props :: JSM Object
props = do
    o <- obj
    o <# interactive $ True
    o <# placement $ ("top" :: JSString)
    o <# offset $ [0 :: Int, 20]
    o <# content $ function1 contentF
    pure o

initTooltips :: JSDOM.Element -> JSM ()
initTooltips context = withDebug "initTooltips" $ do
    xs <- context `querySelectorAll` ("[title]" :: JSString)
    _ <- jsg2 tippy xs props
    pure ()
