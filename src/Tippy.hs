{-# LANGUAGE ScopedTypeVariables #-}

module Tippy (
    setContent, tippy, interactive, placement, offset, content
) where

import Language.Javascript.JSaddle (JSM, (#), (!), MakeObject)
import Data.Text (Text, pack)

tippy, interactive, placement, offset, content :: Text
tippy = pack "tippy"
interactive = pack "interactive"
placement = pack "placement"
offset = pack "offset"
content = pack "content"

setContent :: MakeObject e => e -> Text -> JSM ()
setContent reference cnt = do
    _ <- (reference ! "_tippy") # "setContent" $ cnt
    pure ()
